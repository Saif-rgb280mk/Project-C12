// KINETIC XI — Engine Core
// surface.hpp : the living pitch. A grid of turf cells whose water, wear and compaction
// evolve in real time with the weather and with every footfall. Ball physics, player
// traction, the renderer (puddles, divots, darker wet grass) and the audio system all
// sample this one source of truth.
#pragma once

#include <vector>

#include "kxi/math.hpp"

namespace kxi {

struct WeatherState {
    double rainRateMmPerHour = 0.0;   // 0 dry, 2.5 light, 7.6 moderate, 20+ torrential
    double temperatureC = 15.0;
    double relativeHumidity = 0.6;    // 0..1
    Vec3 wind{0.0, 0.0, 0.0};         // m/s, world space
    double altitudeM = 0.0;           // stadium altitude (air density)
};

/// One cell of the pitch (default 1 m x 1 m).
struct SurfaceCell {
    double moisture = 0.15;      // 0..1 water film on the blades (dew = ~0.3)
    double waterDepthMm = 0.0;   // standing water
    double wear = 0.0;           // 0 pristine grass .. 1 bare, torn-up soil
    double compaction = 0.0;     // 0 loose .. 1 rock hard (reduces drainage)
    double grassHeightMm = 24.0; // mowing height
    double drainageBias = 1.0;   // static per-cell variation (low spots drain worse)
};

/// Coefficients consumed by ball and body physics at a contact point.
struct ContactCoefficients {
    double restitution = 0.68;        // ball bounce (normal)
    double slidingFriction = 0.55;    // ball/turf Coulomb friction while skidding
    double rollingResistance = 0.08;  // deceleration = c * g while rolling
    double shoeTraction = 1.0;        // multiplier on athlete friction circle
    double hardness = 0.5;            // 0 soft .. 1 hard (injury load, bounce)
};

class PitchSurface {
public:
    PitchSurface(double lengthM = 105.0, double widthM = 68.0, double cellSizeM = 1.0,
                 double grassHeightMm = 24.0, std::uint64_t seed = 7);

    /// Advances the hydrology model: rain fills, soil drains, sun/wind evaporate.
    void update(double dt, const WeatherState& weather);

    /// A boot landing on the pitch. impulse ~ body mass * vertical speed (N*s).
    /// Accumulates wear and compaction; hard braking tears turf faster.
    void registerFootfall(const Vec3& position, double impulse, double shear);

    ContactCoefficients coefficientsAt(const Vec3& position) const;
    const SurfaceCell& cellAt(const Vec3& position) const;
    SurfaceCell& cellAt(const Vec3& position);

    double averageMoisture() const;
    double maxWaterDepthMm() const;
    int cellsX() const { return nx_; }
    int cellsY() const { return ny_; }
    double length() const { return length_; }
    double width() const { return width_; }

    /// Sets uniform conditions (useful for tests and for "start of match" presets).
    void setUniform(double moisture, double waterDepthMm, double wear = 0.0);

private:
    int indexOf(const Vec3& position) const;

    double length_, width_, cell_;
    int nx_, ny_;
    std::vector<SurfaceCell> cells_;
};

/// Pure function: coefficients for a given cell state (exposed for unit testing).
ContactCoefficients coefficientsForCell(const SurfaceCell& c);

}  // namespace kxi
