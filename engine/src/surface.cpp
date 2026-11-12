// KINETIC XI — Engine Core
// surface.cpp : pitch hydrology, wear and contact coefficients.
#include "kxi/surface.hpp"

#include <cmath>

namespace kxi {
namespace {

/// Smooth 2-D value noise in [-1, 1] on an integer lattice of the given spacing.
double valueNoise2D(double x, double y, double spacing, std::uint64_t seed) {
    const double gx = x / spacing, gy = y / spacing;
    const double fx = std::floor(gx), fy = std::floor(gy);
    const auto ix = static_cast<std::int64_t>(fx), iy = static_cast<std::int64_t>(fy);
    const double tx = gx - fx, ty = gy - fy;
    const double ux = tx * tx * (3.0 - 2.0 * tx), uy = ty * ty * (3.0 - 2.0 * ty);
    auto h = [&](std::int64_t a, std::int64_t b) {
        return hashToUnit(seed * 0x2545F4914F6CDD1DULL + static_cast<std::uint64_t>(a) * 73856093ULL +
                          static_cast<std::uint64_t>(b) * 19349663ULL);
    };
    const double a = lerp(h(ix, iy), h(ix + 1, iy), ux);
    const double b = lerp(h(ix, iy + 1), h(ix + 1, iy + 1), ux);
    return lerp(a, b, uy);
}

}  // namespace

ContactCoefficients coefficientsForCell(const SurfaceCell& c) {
    const double grass = c.grassHeightMm * (1.0 - 0.7 * c.wear);  // worn turf = shorter grass
    const double puddle = saturate(c.waterDepthMm / 8.0);
    const double mud = c.wear * c.moisture;

    ContactCoefficients k;
    // Bounce: a water film damps a little, standing water kills the bounce, longer grass
    // cushions, and dry bare soil is lively.
    k.restitution = clamp(0.70 - 0.08 * c.moisture - 0.28 * puddle - 0.0025 * (grass - 24.0) +
                              0.06 * c.wear * (1.0 - c.moisture),
                          0.25, 0.82);
    // Skid friction: water lubricates the blades (the "zippy" wet pitch); mud grabs.
    k.slidingFriction = 0.58 * (1.0 - 0.42 * c.moisture) + 0.30 * mud;
    // Rolling resistance: grass length dominates; a wet film speeds the ball up; puddles
    // stop it dead (non-linear — the ball must push water out of the way).
    k.rollingResistance = (0.035 + 0.0019 * grass) * (1.0 - 0.22 * c.moisture) +
                          0.55 * std::pow(puddle, 1.5) + 0.05 * mud;
    // Studs: wet grass and especially churned mud reduce grip -> slips and wider turns.
    k.shoeTraction = (1.0 - 0.22 * c.moisture) * (1.0 - 0.30 * puddle) * (1.0 - 0.25 * mud);
    k.hardness = saturate(0.35 + 0.5 * c.compaction - 0.25 * c.moisture + 0.2 * c.wear * (1.0 - c.moisture));
    return k;
}

PitchSurface::PitchSurface(double lengthM, double widthM, double cellSizeM, double grassHeightMm,
                           std::uint64_t seed)
    : length_(lengthM), width_(widthM), cell_(cellSizeM) {
    nx_ = std::max(1, static_cast<int>(std::ceil(length_ / cell_)));
    ny_ = std::max(1, static_cast<int>(std::ceil(width_ / cell_)));
    cells_.resize(static_cast<size_t>(nx_) * static_cast<size_t>(ny_));
    for (int j = 0; j < ny_; ++j) {
        for (int i = 0; i < nx_; ++i) {
            SurfaceCell& c = cells_[static_cast<size_t>(j * nx_ + i)];
            c.grassHeightMm = grassHeightMm;
            // Low spots: broad undulations (12 m) plus small dips (3 m).
            const double n = 0.7 * valueNoise2D(i * cell_, j * cell_, 12.0, seed) +
                             0.3 * valueNoise2D(i * cell_, j * cell_, 3.0, seed + 1);
            c.drainageBias = clamp(0.95 + 0.6 * n, 0.15, 1.4);
            // Goalmouths and the centre circle start slightly compacted (previous matches).
            const double x = i * cell_ - length_ * 0.5;
            const double y = j * cell_ - width_ * 0.5;
            const double goalmouth = std::exp(-(std::pow(std::abs(x) - length_ * 0.5 + 6.0, 2) + y * y) / 60.0);
            const double centre = std::exp(-(x * x + y * y) / 40.0);
            c.compaction = saturate(0.15 + 0.35 * goalmouth + 0.15 * centre);
        }
    }
}

int PitchSurface::indexOf(const Vec3& p) const {
    const int i = clamp(static_cast<int>((p.x + length_ * 0.5) / cell_), 0, nx_ - 1);
    const int j = clamp(static_cast<int>((p.y + width_ * 0.5) / cell_), 0, ny_ - 1);
    return j * nx_ + i;
}

const SurfaceCell& PitchSurface::cellAt(const Vec3& p) const { return cells_[static_cast<size_t>(indexOf(p))]; }
SurfaceCell& PitchSurface::cellAt(const Vec3& p) { return cells_[static_cast<size_t>(indexOf(p))]; }

ContactCoefficients PitchSurface::coefficientsAt(const Vec3& p) const { return coefficientsForCell(cellAt(p)); }

void PitchSurface::update(double dt, const WeatherState& w) {
    const double rainMmPerS = std::max(0.0, w.rainRateMmPerHour) / 3600.0;
    const double windSpeed = flatLength(w.wind);
    // Evaporation grows with temperature and wind, shrinks with humidity.
    const double evap = 0.00035 * (1.0 + std::max(-5.0, w.temperatureC) / 20.0) *
                        (1.0 - 0.9 * saturate(w.relativeHumidity)) * (1.0 + windSpeed / 6.0);
    for (SurfaceCell& c : cells_) {
        // Blade wetness approaches 1 quickly under rain and dries slowly afterwards.
        c.moisture += (0.004 * w.rainRateMmPerHour * (1.0 - c.moisture) - evap * c.moisture) * dt;
        // Elite sand-based root zones drain ~70 mm/h; compaction and low spots reduce that.
        const double infiltration = 0.02 * c.drainageBias * (1.0 - 0.8 * c.compaction);  // mm/s
        c.waterDepthMm += (rainMmPerS - infiltration - evap * 0.5) * dt;
        c.waterDepthMm = clamp(c.waterDepthMm, 0.0, 30.0);
        if (c.waterDepthMm > 0.05) c.moisture = std::max(c.moisture, 0.97);
        c.moisture = saturate(c.moisture);
    }
}

void PitchSurface::registerFootfall(const Vec3& position, double impulse, double shear) {
    SurfaceCell& c = cellAt(position);
    const double wetFactor = 1.0 + 2.0 * c.moisture;     // wet turf tears far more easily
    c.wear = saturate(c.wear + impulse * saturate(shear) * 1.0e-6 * wetFactor);
    c.compaction = saturate(c.compaction + impulse * 1.5e-6 * (0.5 + c.moisture));
}

double PitchSurface::averageMoisture() const {
    double s = 0.0;
    for (const SurfaceCell& c : cells_) s += c.moisture;
    return s / static_cast<double>(cells_.size());
}

double PitchSurface::maxWaterDepthMm() const {
    double m = 0.0;
    for (const SurfaceCell& c : cells_) m = std::max(m, c.waterDepthMm);
    return m;
}

void PitchSurface::setUniform(double moisture, double waterDepthMm, double wear) {
    for (SurfaceCell& c : cells_) {
        c.moisture = saturate(moisture);
        c.waterDepthMm = std::max(0.0, waterDepthMm);
        c.wear = saturate(wear);
    }
}

}  // namespace kxi
