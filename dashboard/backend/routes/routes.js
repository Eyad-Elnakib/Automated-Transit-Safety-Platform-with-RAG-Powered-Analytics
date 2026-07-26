const express = require('express')
const router = express.Router()
const { Route } = require('@dms/shared-models')

// GET all routes
router.get('/', async (req, res) => {
  try {
    const routes = await Route.find().sort({ createdAt: -1 })
    res.json(routes)
  } catch {
    res.status(500).json({ error: 'Failed to fetch routes' })
  }
})

// GET single route
router.get('/:id', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id)
    if (!route) return res.status(404).json({ error: 'Route not found' })
    res.json(route)
  } catch {
    res.status(500).json({ error: 'Failed to fetch route' })
  }
})

// POST create route
router.post('/', async (req, res) => {
  try {
    const { name } = req.body
    if (!name?.trim()) {
      return res.status(400).json({ error: 'name is required' })
    }
    const route = new Route({ name: name.trim() })
    await route.save()
    res.status(201).json(route)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create route' })
  }
})

// PUT update route
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body
    if (!name?.trim()) {
      return res.status(400).json({ error: 'name is required' })
    }
    const route = await Route.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true, runValidators: true }
    )
    if (!route) return res.status(404).json({ error: 'Route not found' })
    res.json(route)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update route' })
  }
})

// DELETE route
router.delete('/:id', async (req, res) => {
  try {
    const route = await Route.findByIdAndDelete(req.params.id)
    if (!route) return res.status(404).json({ error: 'Route not found' })
    res.json({ message: `Route "${route.name}" deleted successfully` })
  } catch {
    res.status(500).json({ error: 'Failed to delete route' })
  }
})

module.exports = router
