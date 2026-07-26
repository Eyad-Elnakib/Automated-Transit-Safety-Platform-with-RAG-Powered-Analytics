/**
 * Seed script — populates the database with the initial mock drivers.
 * Run with:  npm run seed
 */
const mongoose = require('mongoose')
require('dotenv').config()
const { Driver } = require('@dms/shared-models')

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/driver-monitoring'

const mockDrivers = [
  { id: 'DRV-001', name: 'Ahmed Ali',       avgScore: 92, totalTrips: 148 },
  { id: 'DRV-002', name: 'Mohamed Hassan',  avgScore: 88, totalTrips: 132 },
  { id: 'DRV-003', name: 'Ali Mahmoud',     avgScore: 75, totalTrips: 96  },
  { id: 'DRV-004', name: 'Sara Ahmed',      avgScore: 95, totalTrips: 167 },
  { id: 'DRV-005', name: 'Omar Khaled',     avgScore: 81, totalTrips: 110 },
  { id: 'DRV-006', name: 'Dina Youssef',    avgScore: 90, totalTrips: 125 },
  { id: 'DRV-007', name: 'Hoda Ibrahim',    avgScore: 68, totalTrips: 78  },
  { id: 'DRV-008', name: 'Youssef Adel',    avgScore: 93, totalTrips: 155 },
]

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB')
    await Driver.deleteMany({})
    const inserted = await Driver.insertMany(mockDrivers)
    console.log(`✅ Seeded ${inserted.length} drivers into the database.`)
    process.exit(0)
  })
  .catch((err) => {
    console.error('Seed error:', err.message)
    process.exit(1)
  })
