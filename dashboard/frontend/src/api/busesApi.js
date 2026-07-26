const BASE = '/api/buses'

const handleResponse = async (res) => {
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
  return json
}

export const fetchBuses = () => fetch(BASE).then(handleResponse)

// busId is auto-generated; only capacity is sent
export const createBus = ({ capacity }) =>
  fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ capacity }),
  }).then(handleResponse)

export const updateBus = (id, { capacity }) =>
  fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ capacity }),
  }).then(handleResponse)

export const deleteBus = (id) =>
  fetch(`${BASE}/${id}`, { method: 'DELETE' }).then(handleResponse)
