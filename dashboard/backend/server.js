const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()

const driverRoutes    = require('./routes/drivers')
const routeRoutes     = require('./routes/routes')
const busRoutes       = require('./routes/buses')
const tripRoutes      = require('./routes/trips')
const violationRoutes = require('./routes/violations')

const app = express()
const PORT = process.env.PORT || 5000
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/driver-monitoring'

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/drivers',    driverRoutes)
app.use('/api/routes',     routeRoutes)
app.use('/api/buses',      busRoutes)
app.use('/api/trips',      tripRoutes)
app.use('/api/violations', violationRoutes)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

const RAG_URL = process.env.RAG_URL || 'http://localhost:8001'

// POST /api/chat — proxy to the Python RAG server
app.post('/api/chat', async (req, res) => {
  const { query } = req.body
  if (!query?.trim()) {
    return res.status(400).json({ error: 'query is required' })
  }
  try {
    const upstream = await fetch(`${RAG_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim() }),
    })
    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch {
    res.status(503).json({ error: 'RAG service unavailable — is the Python server running?' })
  }
})

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB:', MONGO_URI)
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`))
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message)
    process.exit(1)
  })
