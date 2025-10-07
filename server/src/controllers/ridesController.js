/**
 * RickShare Rides Controller (server/src/controllers/ridesController.js)
 * Purpose: Business logic for rides endpoints.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../services/db');

// ---------------- Geometry helpers (Haversine + simple projections) ----------------
function deg2rad(d) {
  return (d * Math.PI) / 180;
}

function haversineKm(a, b) {
  const R = 6371; // Earth radius in km
  const dLat = deg2rad(b.lat - a.lat);
  const dLng = deg2rad(b.lng - a.lng);
  const lat1 = deg2rad(a.lat);
  const lat2 = deg2rad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function getRideRouteCoords(ride) {
  const start = ride.start || ride.pickup || null;
  const end = ride.end || ride.destination || null;
  return { start, end };
}

function toXYMeters(origin, point) {
  // Equirectangular approximation to convert lat/lng to local meters
  const meanLat = deg2rad((origin.lat + point.lat) / 2);
  const mPerDegLat = 111_132; // approx meters per deg latitude
  const mPerDegLng = 111_320 * Math.cos(meanLat); // meters per deg longitude
  const x = (point.lng - origin.lng) * mPerDegLng;
  const y = (point.lat - origin.lat) * mPerDegLat;
  return { x, y };
}

function projectParamOnSegmentMeters(a, b, p) {
  // a,b,p are objects with x,y in meters, return t in [0,1] and perpendicular distance
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = p.x - a.x;
  const wy = p.y - a.y;
  const vLen2 = vx * vx + vy * vy;
  if (vLen2 === 0) return { t: 0, d: Math.hypot(wx, wy) };
  let t = (wx * vx + wy * vy) / vLen2;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * vx;
  const projY = a.y + t * vy;
  const d = Math.hypot(p.x - projX, p.y - projY);
  return { t, d };
}

async function listRides(req, res, next) {
  try {
    const rides = await db.getRides();
    res.json(rides);
  } catch (err) {
    next(err);
  }
}

async function createRide(req, res, next) {
  try {
    const { riderName, pickup, destination } = req.body || {};
    if (!pickup || typeof pickup.lat !== 'number' || typeof pickup.lng !== 'number') {
      return res.status(400).json({ message: 'pickup {lat, lng} is required' });
    }

    const ride = {
      id: uuidv4(),
      riderName: riderName || 'Guest',
      pickup,
      destination: destination || null,
      status: 'requested',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.addRide(ride);
    res.status(201).json(ride);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/rides/create
 * Body: {
 *   userId: string,
 *   start: { lat: number, lng: number },
 *   end: { lat: number, lng: number },
 *   fare: number
 * }
 * Behavior: Validates input and saves a new ride with a generated ride ID.
 */
async function createRideInit(req, res, next) {
  try {
    const { userId, start, end, fare } = req.body || {};

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ message: 'userId is required' });
    }
    if (!start || typeof start.lat !== 'number' || typeof start.lng !== 'number') {
      return res.status(400).json({ message: 'start {lat, lng} is required' });
    }
    if (!end || typeof end.lat !== 'number' || typeof end.lng !== 'number') {
      return res.status(400).json({ message: 'end {lat, lng} is required' });
    }
    const parsedFare = Number(fare);
    if (!Number.isFinite(parsedFare) || parsedFare <= 0) {
      return res.status(400).json({ message: 'fare must be a positive number' });
    }

    const ride = {
      id: uuidv4(),
      userId,
      start,
      end,
      fare: parsedFare,
      status: 'initiated',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.addRide(ride);
    res.status(201).json(ride);
  } catch (err) {
    next(err);
  }
}

async function getRide(req, res, next) {
  try {
    const { id } = req.params;
    const ride = await db.findRideById(id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.json(ride);
  } catch (err) {
    next(err);
  }
}

async function updateRide(req, res, next) {
  try {
    const { id } = req.params;
    const allowed = ['status', 'destination'];
    const updates = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }
    updates.updatedAt = new Date().toISOString();

    const updated = await db.updateRide(id, updates);
    if (!updated) return res.status(404).json({ message: 'Ride not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/rides/nearby?lat=..&lng=..&radiusKm=..
 * Returns rides whose start is within the specified radius (km).
 */
async function nearbyRides(req, res, next) {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Number(req.query.radiusKm || 3);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: 'lat and lng are required numbers' });
    }
    const center = { lat, lng };

    const rides = await db.getRides();
    const candidates = rides
      .map((r) => {
        const { start } = getRideRouteCoords(r);
        if (!start) return null;
        const distanceKm = haversineKm(center, start);
        return { ride: r, distanceKm };
      })
      .filter(Boolean)
      .filter((item) => item.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .map(({ ride, distanceKm }) => ({
        id: ride.id,
        userId: ride.userId || null,
        start: getRideRouteCoords(ride).start,
        end: getRideRouteCoords(ride).end,
        fare: ride.fare || null,
        status: ride.status,
        distanceKm,
      }));

    res.json(candidates);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/rides/join
 * Body: { rideId, userId, joinStart: {lat,lng}, joinEnd: {lat,lng} }
 * Logic: Approximates overlap by projecting join points onto the ride segment
 *        and computing overlapped distance. Fare share is proportional to overlap.
 */
async function joinRide(req, res, next) {
  try {
    const { rideId, userId, joinStart, joinEnd } = req.body || {};
    if (!rideId || typeof rideId !== 'string') {
      return res.status(400).json({ message: 'rideId is required' });
    }
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ message: 'userId is required' });
    }
    if (!joinStart || typeof joinStart.lat !== 'number' || typeof joinStart.lng !== 'number') {
      return res.status(400).json({ message: 'joinStart {lat, lng} is required' });
    }
    if (!joinEnd || typeof joinEnd.lat !== 'number' || typeof joinEnd.lng !== 'number') {
      return res.status(400).json({ message: 'joinEnd {lat, lng} is required' });
    }

    const ride = await db.findRideById(rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    const { start, end } = getRideRouteCoords(ride);
    if (!start || !end) {
      return res.status(400).json({ message: 'Ride route is incomplete (start/end required)' });
    }

    // Compute overlap using local meter projection
    const a = { x: 0, y: 0 };
    const b = toXYMeters(start, end);
    const s = toXYMeters(start, joinStart);
    const e = toXYMeters(start, joinEnd);
    const { t: tS, d: dS } = projectParamOnSegmentMeters(a, b, s);
    const { t: tE, d: dE } = projectParamOnSegmentMeters(a, b, e);

    const MAX_OFFSET_M = 400; // allow ~400m corridor to consider as overlapping
    if (dS > MAX_OFFSET_M || dE > MAX_OFFSET_M) {
      return res.status(400).json({ message: 'Join points are too far from the route' });
    }

    const tStart = Math.min(tS, tE);
    const tEnd = Math.max(tS, tE);
    const segLenM = Math.hypot(b.x - a.x, b.y - a.y);
    const overlapM = Math.max(0, tEnd - tStart) * segLenM;
    const overlapKm = overlapM / 1000;
    const routeKm = haversineKm(start, end);
    const proportion = routeKm > 0 ? Math.min(1, overlapKm / routeKm) : 0;
    const baseFare = Number(ride.fare || 0);
    const estimatedShare = baseFare > 0 ? +(baseFare * proportion).toFixed(2) : 0;

    // Persist passenger info
    const passengers = Array.isArray(ride.passengers) ? ride.passengers : [];
    const passengerEntry = {
      userId,
      joinStart,
      joinEnd,
      overlapKm: +overlapKm.toFixed(3),
      shareFare: estimatedShare,
      joinedAt: new Date().toISOString(),
    };

    const updated = await db.updateRide(rideId, {
      passengers: [...passengers, passengerEntry],
      updatedAt: new Date().toISOString(),
    });

    res.json({
      rideId: ride.id,
      routeKm: +routeKm.toFixed(3),
      overlapKm: +overlapKm.toFixed(3),
      proportion: +proportion.toFixed(3),
      estimatedShare,
      passenger: passengerEntry,
      ride: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/rides/complete
 * Body: { rideId, payments?: Array<{ userId, method: 'wallet'|'cash', amount:number }> }
 * Logic: Finalizes ride, recomputes simple distance-based fares and archives summary.
 */
async function completeRide(req, res, next) {
  try {
    const { rideId, payments } = req.body || {};
    if (!rideId || typeof rideId !== 'string') {
      return res.status(400).json({ message: 'rideId is required' });
    }
    const ride = await db.findRideById(rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const { start, end } = getRideRouteCoords(ride);
    if (!start || !end) {
      return res.status(400).json({ message: 'Ride route is incomplete (start/end required)' });
    }

    const routeKm = haversineKm(start, end);
    const baseFare = Number(ride.fare || 0);
    const passengers = Array.isArray(ride.passengers) ? ride.passengers : [];

    // Compute shares proportional to overlapKm; if none, equal split among participants
    const overlaps = passengers.map((p) => Number(p.overlapKm || 0));
    const totalOverlap = overlaps.reduce((a, b) => a + b, 0);
    const participants = [ride.userId, ...passengers.map((p) => p.userId)].filter(Boolean);
    const uniqueParticipants = Array.from(new Set(participants));

    const breakdown = [];
    if (baseFare > 0) {
      if (totalOverlap > 0) {
        // Proportional to overlap
        // Owner share is what's left after passenger overlaps proportionally to owner full route
        const ownerOverlap = routeKm; // owner's full route considered
        const denom = ownerOverlap + totalOverlap;
        const shares = new Map();
        // Owner share
        shares.set(ride.userId || 'owner', +(baseFare * (ownerOverlap / denom)).toFixed(2));
        // Passenger shares
        passengers.forEach((p, i) => {
          const s = +(baseFare * (overlaps[i] / denom)).toFixed(2);
          shares.set(p.userId, (shares.get(p.userId) || 0) + s);
        });
        shares.forEach((amount, userId) => breakdown.push({ userId, amount }));
      } else {
        // Equal split among unique participants
        const per = +(baseFare / Math.max(1, uniqueParticipants.length)).toFixed(2);
        uniqueParticipants.forEach((u) => breakdown.push({ userId: u, amount: per }));
      }
    }

    // Attach payment methods if provided (mock)
    const paymentsApplied = (payments || []).map((p) => ({ ...p, status: 'confirmed' }));

    const summary = {
      rideId: ride.id,
      ownerUserId: ride.userId || null,
      baseFare,
      routeKm: +routeKm.toFixed(3),
      participants: uniqueParticipants,
      breakdown,
      payments: paymentsApplied,
      completedAt: new Date().toISOString(),
    };

    const history = await db.archiveRide(ride.id, summary);
    res.json({ summary: history });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/rides/live/:id
 * Server-Sent Events stream that emits simulated live updates for a ride.
 * This demo simulates two users moving along the route and projects each
 * passenger's progress along the route as well.
 */
async function liveRideSse(req, res, next) {
  try {
    const { id } = req.params;
    const ride = await db.findRideById(id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const { start, end } = getRideRouteCoords(ride);
    if (!start || !end) {
      return res.status(400).json({ message: 'Ride route is incomplete (start/end required)' });
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const originMetersA = { x: 0, y: 0 };
    const originMetersB = toXYMeters(start, end);
    const segLenM = Math.hypot(originMetersB.x - originMetersA.x, originMetersB.y - originMetersA.y);

    // Precompute passenger projections for nicer progress mapping
    const passengerParams = Array.isArray(ride.passengers)
      ? ride.passengers.map((p) => {
          const s = toXYMeters(start, p.joinStart || start);
          const e = toXYMeters(start, p.joinEnd || end);
          const { t: tS } = projectParamOnSegmentMeters(originMetersA, originMetersB, s);
          const { t: tE } = projectParamOnSegmentMeters(originMetersA, originMetersB, e);
          const tStart = Math.min(tS, tE);
          const tEnd = Math.max(tS, tE);
          return { userId: p.userId, tStart, tEnd };
        })
      : [];

    let t = 0; // param along route [0..1]
    let tick = 0;
    const step = 0.02; // ~50 ticks to reach end

    function lerp(a, b, u) {
      return a + (b - a) * u;
    }
    function pointOnRoute(u) {
      return { lat: lerp(start.lat, end.lat, u), lng: lerp(start.lng, end.lng, u) };
    }

    const interval = setInterval(() => {
      t += step;
      if (t > 1) t = 0; // loop for demo
      tick += 1;

      const user1 = pointOnRoute(t);
      const user2 = pointOnRoute(Math.max(0, t - 0.2)); // trail behind

      const passengersProgress = passengerParams.map((pp) => {
        // Map global t to passenger segment [tStart,tEnd]
        const u = Math.min(pp.tEnd, Math.max(pp.tStart, t));
        const pt = pointOnRoute(u);
        // percent along passenger's own segment
        const progress = pp.tEnd > pp.tStart ? (u - pp.tStart) / (pp.tEnd - pp.tStart) : 0;
        return { userId: pp.userId, progress: +progress.toFixed(3), lat: pt.lat, lng: pt.lng };
      });

      const payload = {
        rideId: ride.id,
        tick,
        t: +t.toFixed(3),
        route: { start, end, lengthKm: +((segLenM / 1000).toFixed(3)) },
        moving: {
          user1,
          user2,
        },
        passengers: passengersProgress,
      };

      res.write(`event: tick\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }, 1000);

    req.on('close', () => {
      clearInterval(interval);
      try {
        res.end();
      } catch (_e) {}
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listRides,
  createRide,
  createRideInit,
  nearbyRides,
  joinRide,
  getRide,
  updateRide,
  // SSE live updates
  liveRideSse,
  // Completion
  completeRide,
};
