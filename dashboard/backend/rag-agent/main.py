"""
main.py — Interactive CLI for the multi-agent Bus Monitoring RAG system.

Usage:
  python main.py --setup       # generate data + embeddings + vector index
  python main.py --embed       # embeddings only
  python main.py --test        # run benchmark queries
  python main.py --chat        # interactive REPL
  python main.py --query "..." # single query

Flags can be combined: e.g. --setup --chat
"""

import argparse
import logging
import sys

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from config import settings

console = Console()
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Benchmark queries
# ---------------------------------------------------------------------------
BENCHMARK_QUERIES = [
    "Which driver had the lowest safety score this week?",
    "List all trips with a safety score below 50.",
    "Who is the safest driver in the past 30 days?",
    "How many drowsiness events occurred yesterday?",
    "Which driver used their phone the most while driving?",
    "Which route has the highest number of smoking violations?",
    "Which bus had the most harsh braking events this week?",
    "How many overspeeding incidents happened in the last 7 days?",
    "What were the most dangerous trips recorded recently?",
    "Summarise the safety performance of all drivers this month.",
    "Which is the most common violation?",
    "What violations does Cathy Wood often do?",
]


# ---------------------------------------------------------------------------
# Rich display — shows per-agent timing breakdown
# ---------------------------------------------------------------------------
def display_result(result) -> None:
    """Pretty-print a FinalResponse using Rich."""
    console.rule("[bold cyan]RAG Answer")

    console.print(Panel(result.answer, title="[bold green]Answer", border_style="green"))

    # Agent pipeline timing table
    table = Table(
        title="Agent Pipeline",
        show_header=True,
        header_style="bold magenta",
    )
    table.add_column("Agent", style="cyan")
    table.add_column("Latency", justify="right")
    table.add_column("Detail", style="dim")

    table.add_row(
        "1. QueryAgent",
        f"{result.query_agent_ms:.0f} ms",
        f"intent={result.intent}",
    )
    table.add_row(
        "2. RetrieverAgent",
        f"{result.retriever_agent_ms:.0f} ms",
        f"source={result.source}",
    )
    table.add_row(
        "3. AnalysisAgent",
        f"{result.analysis_agent_ms:.0f} ms",
        f"docs={result.doc_count}",
    )
    table.add_row(
        "4. ResponseAgent",
        f"{result.response_agent_ms:.0f} ms",
        "Groq LLM",
    )
    table.add_row(
        "[bold]Total[/bold]",
        f"[bold]{result.total_ms:.0f} ms[/bold]",
        "",
        style="bold",
    )
    console.print(table)
    console.print()


def display_banner():
    console.print(
        Panel.fit(
            "[bold cyan]Smart Bus Monitoring System[/bold cyan]\n"
            "[dim]Multi-Agent RAG Pipeline[/dim]\n\n"
            "[dim]Agents  : QueryAgent -> RetrieverAgent -> AnalysisAgent -> ResponseAgent[/dim]\n"
            f"[dim]LLM     : {settings.groq_model}[/dim]\n"
            f"[dim]Embed   : {settings.embedding_model}[/dim]\n"
            f"[dim]DB      : {settings.mongodb_database}.{settings.mongodb_collection}[/dim]\n"
            f"[dim]Index   : {settings.vector_index_name}[/dim]",
            border_style="cyan",
            title="[bold]RAG System",
        )
    )


# ---------------------------------------------------------------------------
# Setup flow
# ---------------------------------------------------------------------------
def run_setup(num_days: int = 14, trips_per_day: int = 20) -> None:
    console.print(
        "[dim]Using real driver-monitoring database — skipping data generation.[/dim]\n"
    )
    run_embed()

    console.rule("[bold yellow]Step 2 -- Vector Search Index")
    from embedding_generator import create_vector_search_index
    console.print("Creating Atlas Vector Search index programmatically...")
    ok = create_vector_search_index()
    if ok:
        console.print("[green]Done: Vector search index is READY.[/green]\n")
    else:
        console.print(
            "[yellow]Index creation submitted but not yet READY. "
            "Check Atlas UI — it may still be building (1-3 min).[/yellow]\n"
        )


def run_embed() -> None:
    console.rule("[bold yellow]Step 1 -- Embedding Generation")
    from embedding_generator import generate_and_store_embeddings
    console.print("Computing and storing embeddings...")
    updated = generate_and_store_embeddings()
    console.print(f"[green]Done: {updated} documents updated with embeddings.[/green]\n")


# ---------------------------------------------------------------------------
# Test runner
# ---------------------------------------------------------------------------
def run_tests(queries=None, stream: bool = False) -> None:
    from rag_pipeline import ask

    if queries is None:
        queries = BENCHMARK_QUERIES

    console.rule("[bold yellow]Benchmark Queries")
    console.print(f"Running {len(queries)} queries...\n")

    latencies = []
    for i, query in enumerate(queries, 1):
        console.print(f"[bold dim]Query {i}/{len(queries)}:[/bold dim] {query}")
        result = ask(query, stream=stream)
        display_result(result)
        latencies.append(result.total_ms)

    avg_ms = sum(latencies) / len(latencies)
    console.print(
        f"\n[bold]Benchmark complete[/bold] -- "
        f"avg: [cyan]{avg_ms:.0f} ms[/cyan]  "
        f"min: [green]{min(latencies):.0f} ms[/green]  "
        f"max: [red]{max(latencies):.0f} ms[/red]"
    )


# ---------------------------------------------------------------------------
# Interactive REPL
# ---------------------------------------------------------------------------
def run_chat(stream: bool = True) -> None:
    from rag_pipeline import ask

    console.rule("[bold cyan]Interactive Mode")
    console.print("[dim]Type your question and press Enter. Type 'exit' or 'quit' to stop.[/dim]\n")

    while True:
        try:
            query = console.input("[bold cyan]You:[/bold cyan] ").strip()
        except (EOFError, KeyboardInterrupt):
            console.print("\n[dim]Goodbye.[/dim]")
            break

        if not query:
            continue
        if query.lower() in {"exit", "quit", "q"}:
            console.print("[dim]Goodbye.[/dim]")
            break

        result = ask(query, stream=stream)
        if not stream:
            display_result(result)
        else:
            # After streaming, show compact agent timing
            console.print(
                f"\n[dim]"
                f"QueryAgent={result.query_agent_ms:.0f}ms  "
                f"RetrieverAgent={result.retriever_agent_ms:.0f}ms  "
                f"AnalysisAgent={result.analysis_agent_ms:.0f}ms  "
                f"ResponseAgent={result.response_agent_ms:.0f}ms  "
                f"| Total={result.total_ms:.0f}ms  "
                f"intent={result.intent}  source={result.source}  "
                f"docs={result.doc_count}[/dim]\n"
            )


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def parse_args():
    parser = argparse.ArgumentParser(
        description="Smart Bus Monitoring — Multi-Agent RAG System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--setup", action="store_true", help="Generate data + embeddings + index")
    parser.add_argument("--embed", action="store_true", help="Generate/update embeddings only")
    parser.add_argument("--test", action="store_true", help="Run benchmark queries")
    parser.add_argument("--chat", action="store_true", help="Start interactive REPL")
    parser.add_argument("--query", type=str, help="Run a single query and exit")
    parser.add_argument("--stream", action="store_true", default=True)
    parser.add_argument("--no-stream", dest="stream", action="store_false")
    parser.add_argument("--days", type=int, default=14)
    parser.add_argument("--trips-per-day", type=int, default=20, dest="trips_per_day")
    return parser.parse_args()


def main():
    args = parse_args()
    display_banner()

    if not any([args.setup, args.embed, args.test, args.chat, args.query]):
        console.print(
            "[yellow]No mode specified. Use --help to see options.\n"
            "Running: --setup --test --chat by default.[/yellow]\n"
        )
        args.setup = True
        args.test = True
        args.chat = True

    if args.setup:
        run_setup(num_days=args.days, trips_per_day=args.trips_per_day)

    if args.embed and not args.setup:
        run_embed()

    if args.query:
        from rag_pipeline import ask
        result = ask(args.query, stream=args.stream)
        display_result(result)

    if args.test:
        run_tests(stream=False)

    if args.chat:
        run_chat(stream=args.stream)


if __name__ == "__main__":
    main()
