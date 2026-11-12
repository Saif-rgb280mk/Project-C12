// KINETIC XI — Engine Core
// math.hpp : minimal, dependency-free vector math used by every simulation module.
//
// Coordinate convention (used everywhere in the engine):
//   +x  along the pitch length (towards the "right" goal in the broadcast view)
//   +y  across the pitch (towards the far touchline, away from the main camera)
//   +z  up (gravity acts along -z)
//   Units are SI: metres, seconds, kilograms, radians.
#pragma once

#include <algorithm>
#include <cmath>
#include <cstdint>

namespace kxi {

constexpr double kPi = 3.14159265358979323846;
constexpr double kGravity = 9.81;       // m/s^2
constexpr double kEpsilon = 1e-9;

struct Vec3 {
    double x = 0.0, y = 0.0, z = 0.0;

    constexpr Vec3() = default;
    constexpr Vec3(double x_, double y_, double z_) : x(x_), y(y_), z(z_) {}

    constexpr Vec3 operator+(const Vec3& o) const { return {x + o.x, y + o.y, z + o.z}; }
    constexpr Vec3 operator-(const Vec3& o) const { return {x - o.x, y - o.y, z - o.z}; }
    constexpr Vec3 operator-() const { return {-x, -y, -z}; }
    constexpr Vec3 operator*(double s) const { return {x * s, y * s, z * s}; }
    constexpr Vec3 operator/(double s) const { return {x / s, y / s, z / s}; }
    Vec3& operator+=(const Vec3& o) { x += o.x; y += o.y; z += o.z; return *this; }
    Vec3& operator-=(const Vec3& o) { x -= o.x; y -= o.y; z -= o.z; return *this; }
    Vec3& operator*=(double s) { x *= s; y *= s; z *= s; return *this; }
};

constexpr Vec3 operator*(double s, const Vec3& v) { return v * s; }

constexpr double dot(const Vec3& a, const Vec3& b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
constexpr Vec3 cross(const Vec3& a, const Vec3& b) {
    return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
}
inline double length(const Vec3& v) { return std::sqrt(dot(v, v)); }
inline double lengthSq(const Vec3& v) { return dot(v, v); }
inline Vec3 normalizeOr(const Vec3& v, const Vec3& fallback) {
    const double len = length(v);
    return len > kEpsilon ? v / len : fallback;
}
inline Vec3 normalize(const Vec3& v) { return normalizeOr(v, Vec3{}); }
inline Vec3 flat(const Vec3& v) { return {v.x, v.y, 0.0}; }   // project onto the pitch plane
inline double flatLength(const Vec3& v) { return std::hypot(v.x, v.y); }
inline double distance(const Vec3& a, const Vec3& b) { return length(a - b); }
inline double flatDistance(const Vec3& a, const Vec3& b) { return flatLength(a - b); }

/// Unit vector on the pitch plane for a heading angle (0 = +x, counter-clockwise).
inline Vec3 headingVector(double radians) { return {std::cos(radians), std::sin(radians), 0.0}; }
inline double headingOf(const Vec3& v) { return std::atan2(v.y, v.x); }

template <typename T>
constexpr T clamp(T v, T lo, T hi) { return v < lo ? lo : (v > hi ? hi : v); }
constexpr double saturate(double v) { return clamp(v, 0.0, 1.0); }
constexpr double lerp(double a, double b, double t) { return a + (b - a) * t; }
inline Vec3 lerp(const Vec3& a, const Vec3& b, double t) { return a + (b - a) * t; }

inline double smoothstep(double e0, double e1, double x) {
    const double t = saturate((x - e0) / (e1 - e0));
    return t * t * (3.0 - 2.0 * t);
}

/// Wraps an angle to (-pi, pi].
inline double wrapAngle(double a) {
    while (a > kPi) a -= 2.0 * kPi;
    while (a <= -kPi) a += 2.0 * kPi;
    return a;
}

/// Limits the magnitude of v to maxLen.
inline Vec3 clampLength(const Vec3& v, double maxLen) {
    const double len = length(v);
    return (len > maxLen && len > kEpsilon) ? v * (maxLen / len) : v;
}

/// Critically-damped spring ("smooth damp"), the workhorse of the camera rigs and
/// of any value that must chase a target without overshoot.
inline double smoothDamp(double current, double target, double& velocity,
                         double smoothTime, double dt) {
    smoothTime = std::max(0.0001, smoothTime);
    const double omega = 2.0 / smoothTime;
    const double x = omega * dt;
    const double expo = 1.0 / (1.0 + x + 0.48 * x * x + 0.235 * x * x * x);
    const double change = current - target;
    const double temp = (velocity + omega * change) * dt;
    velocity = (velocity - omega * temp) * expo;
    return target + (change + temp) * expo;
}

/// Small, fast, deterministic PRNG (SplitMix64). Deterministic randomness is mandatory
/// for replays, rollback netcode and reproducible unit tests.
class Rng {
public:
    explicit Rng(std::uint64_t seed = 0x9E3779B97F4A7C15ULL) : state_(seed) {}
    std::uint64_t nextU64() {
        std::uint64_t z = (state_ += 0x9E3779B97F4A7C15ULL);
        z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ULL;
        z = (z ^ (z >> 27)) * 0x94D049BB133111EBULL;
        return z ^ (z >> 31);
    }
    double uniform() { return static_cast<double>(nextU64() >> 11) * (1.0 / 9007199254740992.0); }
    double uniform(double lo, double hi) { return lo + (hi - lo) * uniform(); }
    /// Approximately normal(0,1) using the sum of uniforms (Irwin–Hall, n = 4).
    double gaussian() {
        return (uniform() + uniform() + uniform() + uniform() - 2.0) * 1.7320508075688772;
    }
private:
    std::uint64_t state_;
};

/// Deterministic 1-D value noise in [-1, 1] — used for knuckle-ball wobble and wind gusts.
inline double hashToUnit(std::uint64_t n) {
    n = (n ^ (n >> 33)) * 0xff51afd7ed558ccdULL;
    n = (n ^ (n >> 33)) * 0xc4ceb9fe1a85ec53ULL;
    n ^= n >> 33;
    return static_cast<double>(n >> 11) * (2.0 / 9007199254740992.0) - 1.0;
}
inline double valueNoise1D(double t, std::uint64_t seed) {
    const double fl = std::floor(t);
    const auto i = static_cast<std::int64_t>(fl);
    const double f = t - fl;
    const double u = f * f * (3.0 - 2.0 * f);
    const double a = hashToUnit(seed * 1315423911ULL + static_cast<std::uint64_t>(i));
    const double b = hashToUnit(seed * 1315423911ULL + static_cast<std::uint64_t>(i + 1));
    return lerp(a, b, u);
}

}  // namespace kxi
