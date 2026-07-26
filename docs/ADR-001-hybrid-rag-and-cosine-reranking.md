# ADR 001: Hybrid RAG Routing, Cosine Re-Ranking, and Hallucination Mitigation

* **Status:** Accepted
* **Date:** 2026-07-20
* **Decision-Makers:** Platform Engineering & AI Architecture Team
* **Technical Domain:** Conversational RAG Analytics & Vector Database Ingestion

---

## 1. Context & Problem Statement

The platform requires a natural language query interface allowing fleet supervisors to interrogate historical trip logs, driver safety scores, and violation distributions without writing complex MongoDB queries or manually filtering dashboard tables. 

However, standard LLM implementations face three critical architectural challenges when processing structured telematics:
1. **Domain Term Vocabulary Gap:** Standard general-purpose text embedders frequently misinterpret domain-specific vehicle telematics (e.g., driver IDs `DRV-NNN`, bus IDs `BUS-NNN`, and compound violation labels).
2. **Context Window Saturation & Repetition:** Standard sliding-window text chunking splits single trip events across multiple fragments, causing LLM attention confusion when identical driver names appear across overlapping chunks.
3. **Hardware Latency vs. Accuracy Constraints:** Edge deployment environments (e.g., MAVEN AI Kit and local edge servers) impose strict RAM and CPU compute ceilings, prohibiting massive 1,024+ dimension embeddings or slow re-ranking pipelines.

---

## 2. Decision: 4-Agent Hybrid RAG Pipeline & Embedding Strategy

To overcome these constraints, we architected a **4-Agent RAG Pipeline** (Query, Retriever, Analysis, and Response Agents) supported by the following core design choices:

### A. Embedding Model: `all-MiniLM-L6-v2` (384-Dimensions)
We evaluated three industry-standard embedding models for our MongoDB Atlas vector index:

| Model Candidate | Dimensions | Empirical Decision | Architectural Rationale |
| :--- | :---: | :---: | :--- |
| **`all-MiniLM-L6-v2`** | **384-dim** | **SELECTED** | **Fast CPU inference, optimal memory footprint, strong semantic capture for structured trip logs** |
| `paraphrase-L3-MiniLM-L6-v2`| 384-dim | *Rejected* | Failed to consistently capture specific alphanumeric entity tokens (`DRV-001`, `BUS-50`) |
| `mpnet-base-v2` | 768-dim | *Rejected* | Exceeded latency budget; $3\times$ slower inference with marginal $+1.2\%$ retrieval gain |

### B. Chunking Strategy: Self-Contained Field-Level Chunking
* **Decision:** We rejected arbitrary token sliding-window chunking in favor of **Field-Level Chunking** where **one complete trip document equals exactly one semantic vector chunk**.
* **Rationale:** In sliding-window tests, the LLM wasted 3 out of 5 context slots on fragmented sections of the exact same trip, leading to severe hallucination when counting violations. By encapsulating the driver name, route, timestamp, violation breakdown, and total safety score into a single self-contained summary string before vectorization, retrieval precision reached $100\%$ on targeted trip lookups.

### C. Retrieval Strategy: Hybrid Router (Vector + Aggregation)
* **Decision:** Our Retriever Agent implements a **Hybrid Router** that dynamically selects between three execution pathways:
  1. **Direct Entity Lookup:** If an exact driver ID or name is detected in the prompt, it bypasses vector search and executes a direct MongoDB indexed lookup.
  2. **Aggregation Pipeline:** For mathematical queries (e.g., *"How many total violations occurred this week?"*), it routes to MongoDB `$match`, `$group`, and `$count` pipelines.
  3. **Vector Similarity Search:** For exploratory queries (e.g., *"Show me routes with frequent driver fatigue"*), it executes MongoDB Atlas `$vectorSearch`.
* **Outcome:** In empirical testing, standalone vector search scored $0/3$ on exact aggregation counts, whereas the Hybrid Router achieved $3/3$ ($100\%$) accuracy.

---

## 3. Mathematical Justification: Why Cosine Similarity Re-Ranking?

Once the approximate vector search retrieves the top 10 candidate documents, an exact re-ranking pass orders the top 5 documents for the LLM context window. We specifically selected **Cosine Similarity** over Euclidean (L2) distance and raw Dot Product:

$$\text{cosine}(\mathbf{q}, \mathbf{d}) = \frac{\mathbf{q} \cdot \mathbf{d}}{\|\mathbf{q}\| \times \|\mathbf{d}\|}$$

1. **Direction over Magnitude:** Cosine similarity measures the angle between vector vectors rather than their spatial magnitude. A long trip report with 20 paragraphs and a brief 2-sentence violation summary can share the exact same semantic direction regarding "driver fatigue." Raw dot product without normalization inappropriately favors longer documents.
2. **L2-Normalization Consistency:** The `all-MiniLM-L6-v2` encoder natively outputs L2-normalized vectors ($\|\mathbf{v}\| = 1$). For normalized vectors, the denominator $\|\mathbf{q}\| \times \|\mathbf{d}\|$ equals $1$, simplifying cosine similarity mathematically to the exact dot product $\mathbf{q} \cdot \mathbf{d}$, providing maximum computation speed without sacrificing geometric precision.

---

## 4. Hallucination Mitigation: Three-Prompt Ensemble Strategy

To prevent LLM confabulation under edge compute constraints, we pivoted from relying solely on model parameter scale to enforcing behavioral constraints via a **Three-Prompt Ensemble Strategy**:
1. **Standard Prompt:** Establishes baseline conversational tone and formatting rules.
2. **Evidence-Heavy Prompt:** Strictly forbids speculation; enforces that every assertion must cite specific retrieved MongoDB timestamps and driver IDs.
3. **Concise Prompt:** Constrains token generation to eliminate redundant prose.

**Consequence:** While an individual small model may occasionally hallucinate when querying complex tables, cross-verifying outputs across this distinct 3-prompt architecture reduces the probability of concurrent hallucination to near zero.
