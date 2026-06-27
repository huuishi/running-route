import { useMemo, useState } from 'react'
import './App.css'

const routeLibrary = [
  {
    id: 'east-coast',
    name: 'East Coast Boardwalk Loop',
    location: 'East Coast',
    distanceKm: 8.5,
    difficulty: 'Easy',
    surface: 'Pavement',
    bestFor: 'Relaxed endurance',
    description: 'A breezy waterfront loop with calm views, plenty of shade, and easy access to cafes.',
    highlights: ['Sea breeze', 'Sunset views', 'Waterfront rest stops'],
  },
  {
    id: 'marina-bay',
    name: 'Marina Bay Skyline Run',
    location: 'Central',
    distanceKm: 10,
    difficulty: 'Moderate',
    surface: 'Mixed paths',
    bestFor: 'City energy',
    description: 'A polished urban route that links Marina Bay, the Esplanade, and photogenic landmarks.',
    highlights: ['Skyline views', 'Iconic landmarks', 'Night lights'],
  },
  {
    id: 'macritchie',
    name: 'MacRitchie Reservoir Trail',
    location: 'Central',
    distanceKm: 12,
    difficulty: 'Moderate',
    surface: 'Trail',
    bestFor: 'Nature escape',
    description: 'Shady canopy, rolling terrain, and a calm rhythm make this a favourite for steady runs.',
    highlights: ['Forest shade', 'Birdsong', 'Hill climbs'],
  },
  {
    id: 'jurong-lake',
    name: 'Jurong Lake Gardens Loop',
    location: 'West',
    distanceKm: 7.5,
    difficulty: 'Easy',
    surface: 'Pavement',
    bestFor: 'Beginner-friendly miles',
    description: 'Wide paths and a flat loop make this a dependable choice for a relaxed session.',
    highlights: ['Wide paths', 'Fresh air', 'Easy logistics'],
  },
  {
    id: 'ulu-pandan',
    name: 'Clementi to Ulu Pandan',
    location: 'West',
    distanceKm: 15,
    difficulty: 'Challenging',
    surface: 'Pavement',
    bestFor: 'Long-run build',
    description: 'A longer route with steady pacing and plenty of room to settle into rhythm.',
    highlights: ['Quiet streets', 'Long stretch', 'Hydration points'],
  },
  {
    id: 'pulau-ubin',
    name: 'Pulau Ubin Adventure Run',
    location: 'North',
    distanceKm: 13.5,
    difficulty: 'Challenging',
    surface: 'Trail',
    bestFor: 'Adventure',
    description: 'A rugged island loop with boardwalks, open views, and a more exploratory feel.',
    highlights: ['Island air', 'Rugged terrain', 'Scenic coast'],
  },
  {
    id: 'gardens-bay',
    name: 'Gardens by the Bay Loop',
    location: 'Central',
    distanceKm: 6.5,
    difficulty: 'Easy',
    surface: 'Pavement',
    bestFor: 'Quick recovery',
    description: 'A compact and scenic route for a short run before brunch or a workday reset.',
    highlights: ['Garden views', 'Flat path', 'Fast loop'],
  },
]

const paceLabels = {
  easy: 'Easy + relaxed',
  steady: 'Steady + balanced',
  challenging: 'Challenging + tempo',
}

function App() {
  const [location, setLocation] = useState('Any')
  const [distance, setDistance] = useState(8)
  const [pace, setPace] = useState('steady')
  const [submitted, setSubmitted] = useState(false)

  const recommendations = useMemo(() => {
    const targetDistance = Number(distance)

    return routeLibrary
      .map((route) => {
        let score = 0

        if (location === 'Any') {
          score += 18
        } else if (route.location === location) {
          score += 35
        }

        const distanceGap = Math.abs(route.distanceKm - targetDistance)
        if (distanceGap <= 0.5) {
          score += 35
        } else if (distanceGap <= 2) {
          score += 22
        } else if (distanceGap <= 4) {
          score += 10
        }

        if (pace === 'easy' && route.difficulty === 'Easy') {
          score += 20
        } else if (pace === 'steady' && route.difficulty !== 'Challenging') {
          score += 12
        } else if (pace === 'challenging' && route.difficulty === 'Challenging') {
          score += 20
        }

        return { ...route, score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [distance, location, pace])

  const handleSubmit = (event) => {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="app-shell">
      <header className="hero-card">
        <div className="hero-content">
          <p className="eyebrow">Singapore • Route Planner</p>
          <h1>Find your next run in the city.</h1>
          <p className="hero-copy">
            Enter your preferred distance and area, and we will suggest a route that fits your mood,
            pace, and the best of Singapore’s running landscapes.
          </p>
        </div>
        <div className="hero-badge">Strava-style planning, built for local miles</div>
      </header>

      <form className="planner-card" onSubmit={handleSubmit}>
        <div className="field-row">
          <label className="field">
            <span>Distance</span>
            <div className="field-inline">
              <input
                type="number"
                min="3"
                max="20"
                step="0.5"
                value={distance}
                onChange={(event) => setDistance(Number(event.target.value))}
              />
              <span>km</span>
            </div>
            <input
              type="range"
              min="3"
              max="20"
              step="0.5"
              value={distance}
              onChange={(event) => setDistance(Number(event.target.value))}
            />
          </label>

          <label className="field">
            <span>Area</span>
            <select value={location} onChange={(event) => setLocation(event.target.value)}>
              <option value="Any">Any part of Singapore</option>
              <option value="Central">Central</option>
              <option value="East Coast">East Coast</option>
              <option value="West">West</option>
              <option value="North">North</option>
            </select>
          </label>

          <label className="field">
            <span>Run vibe</span>
            <select value={pace} onChange={(event) => setPace(event.target.value)}>
              <option value="easy">Easy + relaxed</option>
              <option value="steady">Steady + balanced</option>
              <option value="challenging">Challenging + tempo</option>
            </select>
          </label>
        </div>

        <button type="submit">Recommend my route</button>
        <p className="helper-text">
          {submitted
            ? `Ready for ${distance} km in ${location === 'Any' ? 'Singapore' : location}.`
            : 'Pick a distance and neighbourhood to see curated routes.'}
        </p>
      </form>

      <section className="results-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Best matches</p>
            <h2>Recommended loops for {location === 'Any' ? 'Singapore' : location}</h2>
          </div>
          <div className="chip">{distance} km • {paceLabels[pace]}</div>
        </div>

        <div className="cards">
          {recommendations.map((route) => (
            <article className="route-card" key={route.id}>
              <div className="route-top">
                <div>
                  <h3>{route.name}</h3>
                  <p>{route.location}</p>
                </div>
                <span className="pill">{route.distanceKm} km</span>
              </div>
              <p className="route-description">{route.description}</p>
              <ul className="route-meta">
                <li>
                  <strong>Surface</strong>
                  <span>{route.surface}</span>
                </li>
                <li>
                  <strong>Difficulty</strong>
                  <span>{route.difficulty}</span>
                </li>
                <li>
                  <strong>Best for</strong>
                  <span>{route.bestFor}</span>
                </li>
              </ul>
              <div className="highlights">
                {route.highlights.map((highlight) => (
                  <span className="tag" key={highlight}>
                    {highlight}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="insights">
        <article className="insight-card">
          <h3>Why this works</h3>
          <p>Routes are ranked by distance fit, area preference, and the pace you want to keep.</p>
        </article>
        <article className="insight-card">
          <h3>Built for Singapore</h3>
          <p>From waterfront loops to shaded urban trails, the list balances iconic routes and local favourites.</p>
        </article>
      </section>
    </div>
  )
}

export default App
