const BASE = '/api/trips'

const handleResponse = async (res) => {
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
  return json
}

/** Fetch all trips (newest first, driver/route/bus populated). */
export const fetchTrips = () => fetch(BASE).then(handleResponse)

/** Fetch a single trip by MongoDB _id (violations populated). */
export const fetchTrip = (id) => fetch(`${BASE}/${id}`).then(handleResponse)
