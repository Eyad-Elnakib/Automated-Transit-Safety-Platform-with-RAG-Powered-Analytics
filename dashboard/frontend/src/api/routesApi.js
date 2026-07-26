const BASE = '/api/routes'

const handleResponse = async (res) => {
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
  return json
}

export const fetchRoutes = () => fetch(BASE).then(handleResponse)

export const createRoute = ({ name }) =>
  fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }).then(handleResponse)

export const updateRoute = (id, { name }) =>
  fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }).then(handleResponse)

export const deleteRoute = (id) =>
  fetch(`${BASE}/${id}`, { method: 'DELETE' }).then(handleResponse)
