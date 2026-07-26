const express = require('express')
const router = express.Router()
const { Driver, Trip } = require('@dms/shared-models')

/**
 * Finds the highest existing DRV-NNN number and returns the next formatted ID.
 * Falls back to DRV-001 when no drivers exist yet.
 */
const generateDriverId = async () => {
  const drivers = await Driver.find({ id: /^DRV-\d+$/ }).select('id').lean()
  if (drivers.length === 0) return 'DRV-001'
  const max = Math.max(...drivers.map((d) => parseInt(d.id.split('-')[1], 10)))
  return `DRV-${String(max + 1).padStart(3, '0')}`
}

// GET all drivers
router.get('/', async (req, res) => {
  try {
    const drivers = await Driver.find().sort({ createdAt: -1 })
    res.json(drivers)
  } catch {
    res.status(500).json({ error: 'Failed to fetch drivers' })
  }
})

// GET single driver by MongoDB _id
router.get('/:id', async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
    if (!driver) return res.status(404).json({ error: 'Driver not found' })
    res.json(driver)
  } catch {
    res.status(500).json({ error: 'Failed to fetch driver' })
  }
})

// POST create driver — only `name` is accepted; `id` is auto-generated as DRV-NNN
router.post('/', async (req, res) => {
  try {
    const { name } = req.body
    if (!name?.trim()) {
      return res.status(400).json({ error: 'name is required' })
    }

    const id = await generateDriverId()
    const driver = new Driver({ id, name: name.trim() })
    await driver.save()
    res.status(201).json(driver)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create driver' })
  }
})

// PUT update driver — only id and name are editable
router.put('/:id', async (req, res) => {
  try {
    const { id, name } = req.body
    if (!id?.trim() || !name?.trim()) {
      return res.status(400).json({ error: 'id and name are required' })
    }

    // Ensure the new custom id doesn't conflict with another document
    const conflict = await Driver.findOne({ id: id.trim(), _id: { $ne: req.params.id } })
    if (conflict) {
      return res.status(400).json({ error: `Driver ID "${id}" is already in use` })
    }

    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { id: id.trim(), name: name.trim() },
      { new: true, runValidators: true }
    )
    if (!driver) return res.status(404).json({ error: 'Driver not found' })
    res.json(driver)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update driver' })
  }
})

// DELETE driver
router.delete('/:id', async (req, res) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id)
    if (!driver) return res.status(404).json({ error: 'Driver not found' })
    res.json({ message: `Driver "${driver.name}" deleted successfully` })
  } catch {
    res.status(500).json({ error: 'Failed to delete driver' })
  }
})

// GET all trips for a driver (newest first) with violations fully populated
router.get('/:id/trips', async (req, res) => {
  try {
    const trips = await Trip.find({ driver: req.params.id })
      .sort({ startTime: -1 })
      .populate('route', 'name')
      .populate('bus', 'busId capacity')
      .populate({ path: 'violations', options: { sort: { timestamp: 1 } } })
      .lean()
    res.json(trips)
  } catch {
    res.status(500).json({ error: 'Failed to fetch trips for driver' })
  }
})

module.exports = router
