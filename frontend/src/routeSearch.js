const ROAD_FACTOR = 1.35

export const POPULAR_LOCATIONS = [
  { id: 'marina-bay', name: 'Marina Bay Sands', region: 'Central', lat: 1.2834, lng: 103.8607, description: 'Iconic waterfront promenade' },
  { id: 'gardens-bay', name: 'Gardens by the Bay', region: 'Central', lat: 1.2816, lng: 103.8636, description: 'Scenic garden paths' },
  { id: 'fort-canning', name: 'Fort Canning Park', region: 'Central', lat: 1.2966, lng: 103.8466, description: 'Shaded hilltop trails' },
  { id: 'clarke-quay', name: 'Clarke Quay', region: 'Central', lat: 1.2905, lng: 103.8465, description: 'Riverside city running' },
  { id: 'macritchie', name: 'MacRitchie Reservoir', region: 'Central', lat: 1.3475, lng: 103.8350, description: 'Forest reservoir loop' },
  { id: 'east-coast-lagoon', name: 'East Coast Park Lagoon', region: 'East Coast', lat: 1.3050, lng: 103.9350, description: 'Sea breeze boardwalk' },
  { id: 'katong-park', name: 'Katong Park', region: 'East Coast', lat: 1.2970, lng: 103.8820, description: 'Coastal neighbourhood run' },
  { id: 'bedok-reservoir', name: 'Bedok Reservoir', region: 'East Coast', lat: 1.3401, lng: 103.9345, description: 'Flat reservoir loop' },
  { id: 'pasir-ris', name: 'Pasir Ris Park', region: 'East Coast', lat: 1.3760, lng: 103.9550, description: 'Mangrove boardwalk' },
  { id: 'jurong-lake', name: 'Jurong Lake Gardens', region: 'West', lat: 1.3354, lng: 103.7265, description: 'Wide lakeside paths' },
  { id: 'chinese-garden', name: 'Chinese Garden', region: 'West', lat: 1.3387, lng: 103.7317, description: 'Pagoda and lake views' },
  { id: 'bukit-batok', name: 'Bukit Batok Nature Park', region: 'West', lat: 1.3523, lng: 103.7769, description: 'Hilly nature trails' },
  { id: 'west-coast', name: 'West Coast Park', region: 'West', lat: 1.2915, lng: 103.7615, description: 'Quiet coastal stretch' },
  { id: 'woodlands', name: 'Woodlands Waterfront', region: 'North', lat: 1.4560, lng: 103.7724, description: 'Northern waterfront' },
  { id: 'admiralty', name: 'Admiralty Park', region: 'North', lat: 1.4511, lng: 103.7782, description: 'Adventure playground trails' },
  { id: 'punggol', name: 'Punggol Waterway', region: 'North', lat: 1.4131, lng: 103.9094, description: 'Waterway park loop' },
]

function haversineKm(lat1, lng1, lat2, lng2) {
  const radiusKm = 6371
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const dPhi = ((lat2 - lat1) * Math.PI) / 180
  const dLambda = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2
  return 2 * radiusKm * Math.asin(Math.sqrt(a))
}

function photoUrl(lat, lng) {
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: '15',
    size: '400x300',
    markers: `${lat},${lng},red`,
  })
  return `https://staticmap.openstreetmap.de/staticmap.php?${params.toString()}`
}

function pointFromLocation(location) {
  return {
    name: location.name,
    lat: location.lat,
    lng: location.lng,
    photo_url: photoUrl(location.lat, location.lng),
  }
}

function distanceBand(targetKm) {
  if (targetKm <= 4) {
    return [2, 4]
  }
  const margin = Math.min(2, targetKm * 0.25)
  return [Math.max(2, targetKm - margin), targetKm + margin]
}

function scoreCandidate(distanceKm, targetKm, minKm, maxKm) {
  if (distanceKm < minKm || distanceKm > maxKm) {
    return null
  }
  return -Math.abs(distanceKm - targetKm)
}

function difficultyForDistance(distanceKm, pace) {
  if (pace === 'easy') {
    return distanceKm <= 5 ? 'Easy' : 'Moderate'
  }
  if (pace === 'challenging') {
    return distanceKm >= 8 ? 'Challenging' : 'Moderate'
  }
  return distanceKm <= 6 ? 'Easy' : 'Moderate'
}

export function generateRoutesLocally(region, targetKm, pace = 'steady', limit = 3) {
  const locations =
    region === 'Any'
      ? POPULAR_LOCATIONS
      : POPULAR_LOCATIONS.filter((location) => location.region === region)

  if (locations.length < 2) {
    return []
  }

  const [minKm, maxKm] = distanceBand(targetKm)
  const candidates = []

  for (const start of locations) {
    const startPoint = pointFromLocation(start)

    for (const end of locations) {
      if (start.id === end.id) {
        continue
      }

      const directKm = haversineKm(start.lat, start.lng, end.lat, end.lng) * ROAD_FACTOR
      const endPoint = pointFromLocation(end)

      for (const [routeType, distanceKm, name, description] of [
        [
          'out-and-back',
          directKm * 2,
          `${start.name} out-and-back`,
          `Run from ${start.name} toward ${end.name} and return for a balanced out and back.`,
        ],
        [
          'point-to-point',
          directKm,
          `${start.name} to ${end.name}`,
          `A direct point-to-point linking two popular spots in ${start.region}.`,
        ],
      ]) {
        const score = scoreCandidate(distanceKm, targetKm, minKm, maxKm)
        if (score === null) {
          continue
        }

        candidates.push([
          score,
          {
            id: `${start.id}-${end.id}-${routeType}`,
            name,
            region: start.region,
            distance_km: Math.round(distanceKm * 10) / 10,
            route_type: routeType,
            start: startPoint,
            end: routeType === 'point-to-point' ? endPoint : startPoint,
            description,
            highlights: [start.description, end.description, routeType.replace('-', ' ')],
            difficulty: difficultyForDistance(distanceKm, pace),
            surface: 'Mixed paths',
            best_for: distanceKm <= 5 ? 'Short city runs' : 'Steady endurance',
          },
        ])
      }

      const loopKm = directKm * 2
      const loopScore = scoreCandidate(loopKm, targetKm, minKm, maxKm)
      if (loopScore !== null) {
        candidates.push([
          loopScore,
          {
            id: `${start.id}-${end.id}-loop`,
            name: `${start.name} loop via ${end.name}`,
            region: start.region,
            distance_km: Math.round(loopKm * 10) / 10,
            route_type: 'loop',
            start: startPoint,
            end: startPoint,
            description: `A scenic loop starting at ${start.name}, passing ${end.name}, and returning.`,
            highlights: [start.description, end.description, 'Loop'],
            difficulty: difficultyForDistance(loopKm, pace),
            surface: 'Pavement',
            best_for: 'Neighbourhood exploration',
          },
        ])
      }
    }
  }

  candidates.sort((a, b) => b[0] - a[0])

  const seen = new Set()
  const results = []
  for (const [, route] of candidates) {
    if (seen.has(route.id)) {
      continue
    }
    seen.add(route.id)
    results.push(route)
    if (results.length >= limit) {
      break
    }
  }

  return results
}

function apiBaseUrl() {
  const configured = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
  if (configured) {
    return configured
  }
  if (import.meta.env.DEV) {
    return ''
  }
  return ''
}

export async function searchRoutes({ region, distanceKm, pace }) {
  const params = new URLSearchParams({
    region,
    distance_km: String(distanceKm),
    pace,
    limit: '3',
  })

  const base = apiBaseUrl()
  const url = `${base}/api/routes/search?${params.toString()}`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Route search failed (${response.status})`)
    }
    const payload = await response.json()
    return {
      routes: payload.routes,
      source: payload.google_maps_configured ? 'google-maps' : 'api-fallback',
    }
  } catch {
    return {
      routes: generateRoutesLocally(region, distanceKm, pace, 3),
      source: 'local-fallback',
    }
  }
}
