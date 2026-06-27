import { useEffect, useRef, useState } from 'react'
import './App.css'
import { searchRoutes } from './routeSearch.js'
import { supabase } from './supabaseClient.js'

const paceLabels = {
  easy: 'Easy + relaxed',
  steady: 'Steady + balanced',
  challenging: 'Challenging + tempo',
}

const completionRadiusMeters = 60
const leaveRadiusMeters = 200

function haversineMeters(lat1, lng1, lat2, lng2) {
  const radiusKm = 6371
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const dPhi = ((lat2 - lat1) * Math.PI) / 180
  const dLambda = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2
  return 2 * radiusKm * Math.asin(Math.sqrt(a)) * 1000
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) {
    return '—'
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`
  }
  return `${Math.round(meters)} m`
}

function formatDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '00:00'
  }
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function routeSummary(route) {
  const via = route.via ? ` via ${route.via.name}` : ''
  return `${route.start.name} → ${route.end.name}${via}`
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
  const [currentRun, setCurrentRun] = useState(null)
  const [trackerNotice, setTrackerNotice] = useState('')
  const [trackerError, setTrackerError] = useState('')
  const [saveNotice, setSaveNotice] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [session, setSession] = useState(null)

  const watchIdRef = useRef(null)
  const timerIdRef = useRef(null)
  const startTimeRef = useRef(null)
  const furthestFromStartRef = useRef(0)
  const latestRouteRef = useRef(null)

  useEffect(() => {
    if (!supabase) {
      return undefined
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(
    () => () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      if (timerIdRef.current !== null) {
        window.clearInterval(timerIdRef.current)
      }
    },
    [],
  )

  const refreshTimer = () => {
    setCurrentRun((existing) => {
      if (!existing || existing.status !== 'running') {
        return existing
      }
      return {
        ...existing,
        elapsedSeconds: Math.max(0, Math.floor((Date.now() - existing.startedAt) / 1000)),
      }
    })
  }

  const stopHardwareTracking = () => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }
    watchIdRef.current = null
    if (timerIdRef.current !== null) {
      window.clearInterval(timerIdRef.current)
    }
    timerIdRef.current = null
  }

  const completeRun = (route, elapsedSeconds, distanceToEndMeters, distanceToStartMeters) => {
    stopHardwareTracking()
    setCurrentRun((existing) =>
      existing && existing.route.id === route.id
        ? {
            ...existing,
            status: 'completed',
            completedAt: Date.now(),
            elapsedSeconds,
            distanceToEndMeters,
            distanceToStartMeters,
            completionText: `Completed your journey in ${formatDuration(elapsedSeconds)}.`,
          }
        : existing,
    )
    setTrackerNotice(`Completed your journey in ${formatDuration(elapsedSeconds)}.`)
    setTrackerError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const filters = { location, distance, pace }
    setAppliedFilters(filters)
    setSubmitted(true)
    setLoading(true)
    setError('')
    setTrackerNotice('')
    setSaveNotice('')

    const result = await searchRoutes({
      region: filters.location,
      distanceKm: filters.distance,
      pace: filters.pace,
    })

    setRecommendations(result.routes)
    setLoading(false)

    if (!result.routes.length) {
      setError('No routes matched that distance in this area. Try another neighbourhood or distance.')
    }
  }

  const startRoute = async (route) => {
    if (!route) {
      return
    }
    if (!navigator.geolocation) {
      setTrackerError('Location tracking is not available in this browser.')
      return
    }

    stopHardwareTracking()
    setSaveNotice('')
    setTrackerError('')
    setTrackerNotice(`Tracking ${route.name}…`)

    const startedAt = Date.now()
    startTimeRef.current = startedAt
    furthestFromStartRef.current = 0
    latestRouteRef.current = route

    setCurrentRun({
      route,
      status: 'running',
      startedAt,
      elapsedSeconds: 0,
      latestPosition: null,
      distanceToStartMeters: null,
      distanceToEndMeters: null,
      furthestFromStartMeters: 0,
      completionText: '',
      saved: false,
    })

    timerIdRef.current = window.setInterval(refreshTimer, 1000)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const routeInFlight = latestRouteRef.current
        if (!routeInFlight || startTimeRef.current === null) {
          return
        }

        const { latitude, longitude } = position.coords
        const distanceToStartMeters = haversineMeters(
          latitude,
          longitude,
          routeInFlight.start.lat,
          routeInFlight.start.lng,
        )
        const distanceToEndMeters = haversineMeters(
          latitude,
          longitude,
          routeInFlight.end.lat,
          routeInFlight.end.lng,
        )
        const furthestFromStartMeters = Math.max(furthestFromStartRef.current, distanceToStartMeters)
        furthestFromStartRef.current = furthestFromStartMeters
        const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startTimeRef.current) / 1000))

        setCurrentRun((existing) =>
          existing && existing.route.id === routeInFlight.id
            ? {
                ...existing,
                elapsedSeconds,
                latestPosition: { latitude, longitude },
                distanceToStartMeters,
                distanceToEndMeters,
                furthestFromStartMeters,
              }
            : existing,
        )

        const finishedPointToPoint =
          routeInFlight.route_type === 'point-to-point' && distanceToEndMeters <= completionRadiusMeters
        const finishedCircuit =
          routeInFlight.route_type !== 'point-to-point' &&
          furthestFromStartMeters >= leaveRadiusMeters &&
          distanceToStartMeters <= completionRadiusMeters &&
          elapsedSeconds >= 60

        if (finishedPointToPoint || finishedCircuit) {
          completeRun(routeInFlight, elapsedSeconds, distanceToEndMeters, distanceToStartMeters)
        }
      },
      (geolocationError) => {
        stopHardwareTracking()
        setCurrentRun((existing) =>
          existing && existing.route.id === route.id
            ? {
                ...existing,
                status: 'idle',
              }
            : existing,
        )
        setTrackerError(geolocationError.message || 'Location tracking failed.')
        setTrackerNotice('')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      },
    )
  }

  const saveActivity = async () => {
    if (!supabase) {
      setSaveNotice('Connect Supabase in the frontend environment variables first.')
      return
    }
    if (!session) {
      setSaveNotice('Sign in first, then save this activity to your account.')
      return
    }
    if (!currentRun || currentRun.status !== 'completed' || currentRun.saved) {
      return
    }

    setSaveLoading(true)
    setSaveNotice('')

    const payload = {
      user_id: session.user.id,
      route_id: currentRun.route.id,
      route_name: currentRun.route.name,
      region: currentRun.route.region,
      route_type: currentRun.route.route_type,
      distance_km: currentRun.route.distance_km,
      duration_seconds: currentRun.elapsedSeconds,
      started_at: new Date(currentRun.startedAt).toISOString(),
      completed_at: new Date(currentRun.completedAt ?? Date.now()).toISOString(),
      start_lat: currentRun.route.start.lat,
      start_lng: currentRun.route.start.lng,
      end_lat: currentRun.route.end.lat,
      end_lng: currentRun.route.end.lng,
      route_map_url: currentRun.route.map_url,
      directions_url: currentRun.route.directions_url,
      route_snapshot: currentRun.route,
    }

    const { error: insertError } = await supabase.from('activities').insert([payload])

    setSaveLoading(false)
    if (insertError) {
      setSaveNotice(insertError.message)
      return
    }

    setSaveNotice('Saved to your account.')
    setCurrentRun((existing) =>
      existing && existing.route.id === currentRun.route.id ? { ...existing, saved: true } : existing,
    )
  }

  const sendSignInLink = async (event) => {
    event.preventDefault()
    if (!supabase) {
      setAuthNotice('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.')
      return
    }
    if (!authEmail.trim()) {
      setAuthNotice('Enter your email address.')
      return
    }

    setAuthLoading(true)
    setAuthNotice('')

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: authEmail.trim(),
      options: {
        emailRedirectTo: window.location.href,
      },
    })

    setAuthLoading(false)
    setAuthNotice(signInError ? signInError.message : 'Check your email for the sign-in link.')
  }

  const signOut = async () => {
    if (!supabase) {
      return
    }
    await supabase.auth.signOut()
    setSession(null)
  }

  const openRouteMap = (route) => {
    window.open(route.directions_url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="app-shell">
      <header className="hero-card">
        <div className="hero-content">
          <p className="eyebrow">Singapore • Route Planner</p>
          <h1>Find your next run in the city.</h1>
          <p className="hero-copy">
            Enter your preferred distance and area. We pick popular local spots, build routes as close
            to your target as possible, and show Google Maps photos and route maps for each suggestion.
          </p>
        </div>
        <div className="hero-badge">Popular spots • Distance-matched routes</div>
      </header>

      <section className="auth-card">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Account</p>
            <h2>Save completed runs</h2>
          </div>
          {session ? <span className="chip">Signed in</span> : <span className="chip subtle">Not signed in</span>}
        </div>

        {session ? (
          <div className="auth-status-row">
            <div>
              <strong>{session.user.email}</strong>
              <p>Completed activities can be saved straight to your account.</p>
            </div>
            <button type="button" className="secondary-button" onClick={signOut}>
              Sign out
            </button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={sendSignInLink}>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <button type="submit" className="primary-button" disabled={authLoading}>
              {authLoading ? 'Sending link…' : 'Send sign-in link'}
            </button>
          </form>
        )}
        {authNotice ? <p className="helper-text">{authNotice}</p> : null}
      </section>

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

        <button type="submit" className="primary-button" disabled={loading}>
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
              Recommended routes for {appliedFilters.location === 'Any' ? 'Singapore' : appliedFilters.location}
            </h2>
          </div>
          <div className="chip">
            {appliedFilters.distance} km • {paceLabels[appliedFilters.pace]}
          </div>
        </div>

        <div className="cards">
          {recommendations.map((route) => (
            <article className="route-card" key={route.id}>
              <div className="route-card-header">
                <div>
                  <button type="button" className="route-name-button" onClick={() => openRouteMap(route)}>
                    {route.name}
                  </button>
                  <p>{routeSummary(route)}</p>
                </div>
                <span className="pill">{route.distance_km} km</span>
              </div>

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
              <div className="tracker-actions compact-actions">
                <button type="button" className="secondary-button" onClick={() => openRouteMap(route)}>
                  View map
                </button>
                <button type="button" className="secondary-button" onClick={() => startRoute(route)}>
                  Start Route
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="tracker-panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Live tracking</p>
            <h2>{currentRun?.route ? currentRun.route.name : 'No route in progress'}</h2>
          </div>
          <span className={`chip ${currentRun?.status === 'completed' ? '' : 'subtle'}`}>
            {currentRun?.status === 'running'
              ? 'Running'
              : currentRun?.status === 'completed'
                ? 'Completed'
                : 'Idle'}
          </span>
        </div>

        <div className="tracker-stats">
          <div>
            <span>Elapsed</span>
            <strong>{formatDuration(currentRun?.elapsedSeconds ?? 0)}</strong>
          </div>
          <div>
            <span>To end</span>
            <strong>{formatDistance(currentRun?.distanceToEndMeters)}</strong>
          </div>
          <div>
            <span>From start</span>
            <strong>{formatDistance(currentRun?.distanceToStartMeters)}</strong>
          </div>
          <div>
            <span>Furthest away</span>
            <strong>{formatDistance(currentRun?.furthestFromStartMeters)}</strong>
          </div>
        </div>

        {trackerNotice ? <p className="success-text">{trackerNotice}</p> : null}
        {trackerError ? <p className="error-text">{trackerError}</p> : null}
        {currentRun?.completionText ? <p className="success-text">{currentRun.completionText}</p> : null}

        <div className="tracker-actions">
          <button
            type="button"
            className="primary-button"
            onClick={saveActivity}
            disabled={!currentRun || currentRun.status !== 'completed' || currentRun.saved || saveLoading}
          >
            {saveLoading ? 'Saving…' : currentRun?.saved ? 'Saved' : 'Save activity'}
          </button>
          {currentRun?.status === 'completed' ? (
            <span className="saved-note">{saveNotice || 'Ready to save to your account.'}</span>
          ) : (
            <span className="saved-note">{saveNotice || 'Start a route to begin tracking.'}</span>
          )}
        </div>
      </section>

      <section className="insights">
        <article className="insight-card">
          <h3>How routes are built</h3>
          <p>
            We start from popular running locations in your chosen region, then pick loops and
            out-and-back paths whose distance is closest to your target.
          </p>
        </article>
        <article className="insight-card">
          <h3>Photos and maps</h3>
          <p>
            Each suggestion includes Google Maps-backed imagery and a literal route map when the API
            key is configured on the backend.
          </p>
        </article>
      </section>
    </div>
  )
}

export default App
