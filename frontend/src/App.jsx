import { useState } from 'react'
import './App.css'
import { searchRoutes } from './routeSearch.js'

const paceLabels = {
  easy: 'Easy + relaxed',
  steady: 'Steady + balanced',
  challenging: 'Challenging + tempo',
}

function App() {
  const [location, setLocation] = useState('Any')
  const [distance, setDistance] = useState(3)
  const [pace, setPace] = useState('steady')
  const [appliedFilters, setAppliedFilters] = useState({
    location: 'Any',
    distance: 3,
    pace: 'steady',
  })
  const [submitted, setSubmitted] = useState(false)
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [photoSource, setPhotoSource] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    const filters = { location, distance, pace }
    setAppliedFilters(filters)
    setSubmitted(true)
    setLoading(true)
    setError('')

    const result = await searchRoutes({
      region: filters.location,
      distanceKm: filters.distance,
      pace: filters.pace,
    })

    setRecommendations(result.routes)
    setPhotoSource(result.source)
    setLoading(false)

    if (!result.routes.length) {
      setError('No routes matched that distance in this area. Try another neighbourhood or distance.')
    }
  }

  return (
    <div className="app-shell">
      <header className="hero-card">
        <div className="hero-content">
          <p className="eyebrow">Singapore • Route Planner</p>
          <h1>Find your next run in the city.</h1>
          <p className="hero-copy">
            Enter your preferred distance and area. We pick popular local spots, build routes as close
            to your target as possible, and show Google Maps photos of each start and end point.
          </p>
        </div>
        <div className="hero-badge">Popular spots • Distance-matched routes</div>
      </header>

      <form className="planner-card" onSubmit={handleSubmit}>
        <div className="field-row">
          <label className="field">
            <span>Distance</span>
            <div className="field-inline">
              <input
                type="number"
                min="2"
                max="20"
                step="0.5"
                value={distance}
                onChange={(event) => setDistance(Number(event.target.value))}
              />
              <span>km</span>
            </div>
            <input
              type="range"
              min="2"
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

        <button type="submit" disabled={loading}>
          {loading ? 'Finding routes…' : 'Recommend my route'}
        </button>
        <p className="helper-text">
          {loading
            ? 'Searching popular locations and matching route distances…'
            : submitted
              ? `Ready for ${appliedFilters.distance} km in ${appliedFilters.location === 'Any' ? 'Singapore' : appliedFilters.location}.`
              : 'Pick a distance and neighbourhood to see curated routes.'}
        </p>
        {error ? <p className="error-text">{error}</p> : null}
      </form>

      <section className="results-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Best matches</p>
            <h2>
              Recommended routes for{' '}
              {appliedFilters.location === 'Any' ? 'Singapore' : appliedFilters.location}
            </h2>
          </div>
          <div className="chip">
            {appliedFilters.distance} km • {paceLabels[appliedFilters.pace]}
          </div>
        </div>

        {photoSource ? (
          <p className="photo-source">
            {photoSource === 'google-maps'
              ? 'Photos from Google Maps.'
              : 'Map previews shown while Google Maps API is unavailable.'}
          </p>
        ) : null}

        <div className="cards">
          {recommendations.map((route) => (
            <article className="route-card" key={route.id}>
              <div className="route-photos">
                <figure>
                  <img src={route.start.photo_url} alt={`Start: ${route.start.name}`} loading="lazy" />
                  <figcaption>Start • {route.start.name}</figcaption>
                </figure>
                <figure>
                  <img src={route.end.photo_url} alt={`End: ${route.end.name}`} loading="lazy" />
                  <figcaption>End • {route.end.name}</figcaption>
                </figure>
              </div>

              <div className="route-top">
                <div>
                  <h3>{route.name}</h3>
                  <p>{route.region}</p>
                </div>
                <span className="pill">{route.distance_km} km</span>
              </div>
              <p className="route-description">{route.description}</p>
              <ul className="route-meta">
                <li>
                  <strong>Route type</strong>
                  <span>{route.route_type.replace('-', ' ')}</span>
                </li>
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
                  <span>{route.best_for}</span>
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
          <h3>How routes are built</h3>
          <p>
            We start from popular running locations in your chosen region, then pick loops and
            out-and-back paths whose distance is closest to your target (for example, 2–4 km when you
            search for 3 km).
          </p>
        </article>
        <article className="insight-card">
          <h3>Start and end photos</h3>
          <p>
            Each suggestion includes map imagery for the start and end points, powered by Google Maps
            when an API key is configured on the backend.
          </p>
        </article>
      </section>
    </div>
  )
}

export default App
