const express = require('express')
const router = express.Router()
const { Bus } = require('@dms/shared-models')

/**
 * Finds the highest existing BUS-NNN number and returns the next formatted ID.
 * Falls back to BUS-001 when no buses exist yet.
 */
const generateBusId = async () => {
  const buses = await Bus.find({ busId: /^BUS-\d+$/ }).select('busId').lean()
  if (buses.length === 0) return 'BUS-001'
  const max = Math.max(...buses.map((b) => parseInt(b.busId.split('-')[1], 10)))
  return `BUS-${String(max + 1).padStart(3, '0')}`
}

// GET all buses
router.get('/', async (req, res) => {
  try {
    const buses = await Bus.find().sort({ createdAt: -1 })
    res.json(buses)
  } catch {
    res.status(500).json({ error: 'Failed to fetch buses' })
  }
})

// POST create bus — only capacity accepted; busId is auto-generated
router.post('/', async (req, res) => {
  try {
    const capacity = Number(req.body.capacity)
    if (![27, 50].includes(capacity)) {
      return res.status(400).json({ error: 'capacity must be 27 or 50' })
    }
    const busId = await generateBusId()
    const bus = new Bus({ busId, capacity })
    await bus.save()
    res.status(201).json(bus)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create bus' })
  }
})

// PUT update bus — only capacity is editable
router.put('/:id', async (req, res) => {
  try {
    const capacity = Number(req.body.capacity)
    if (![27, 50].includes(capacity)) {
      return res.status(400).json({ error: 'capacity must be 27 or 50' })
    }
    const bus = await Bus.findByIdAndUpdate(
      req.params.id,
      { capacity },
      { new: true, runValidators: true }
    )
    if (!bus) return res.status(404).json({ error: 'Bus not found' })
    res.json(bus)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update bus' })
  }
})

// DELETE bus
router.delete('/:id', async (req, res) => {
  try {
    const bus = await Bus.findByIdAndDelete(req.params.id)
    if (!bus) return res.status(404).json({ error: 'Bus not found' })
    res.json({ message: `Bus "${bus.busId}" deleted successfully` })
  } catch {
    res.status(500).json({ error: 'Failed to delete bus' })
  }
})

module.exports = router
