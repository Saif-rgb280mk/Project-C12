// KINETIC XI — Metal Shading Language
// GrassBlades.metal : GPU-instanced 3D turf blades that READ THE LIVING PITCH.
//   * Every blade samples the pitch-state texture written each frame from PitchSurface:
//       R = moisture (0..1)   G = standing water (0..1 = 0..8 mm)
//       B = wear (0..1)       A = mowing-stripe direction (0 or 1)
//   * Worn turf -> shorter, browner, flattened blades; water -> darker, glossy, laid flat.
//   * Wind sway uses two phase-shifted sines along a quadratic bend so blades never stretch.
//   * Distance LOD: blades thin out and finally fade into the base turf albedo, so the
//     "Grass Density" graphics setting maps directly to the instance budget.
// NOTE: requires the macOS SDK's Metal compiler (xcrun metal) — not compiled in the Linux
// container that produced the engine test results.

#include <metal_stdlib>
using namespace metal;

struct GrassUniforms {
    float4x4 viewProjection;
    float3   cameraPosition;
    float    time;
    float2   windDirection;     // normalised, pitch plane
    float    windStrength;      // 0..1
    float    bladeHeight;       // metres (mowing height ~0.024 .. 0.03)
    float2   pitchSize;         // (105, 68)
    float    lodNear;           // full density up to here (m)
    float    lodFar;            // blades fully faded at this distance (m)
    float3   sunDirection;      // normalised, pointing toward the sun/floodlight key
    float    floodlightIntensity;
};

struct BladeInstance {
    float2 position;            // pitch coordinates (m), x along length, y across
    float  rotation;            // radians around +z
    float  heightScale;         // per-blade variation 0.7..1.3
    float  stiffness;           // 0.5..1.5
    float  colourVariation;     // -1..1
};

struct VertexOut {
    float4 position [[position]];
    float3 worldPosition;
    float3 normal;
    float  heightFraction;
    float  wetness;
    float  water;
    float  wear;
    float  stripe;
    float  colourVariation;
    float  fade;
};

constant uint kSegments = 3;                       // 3 quads + tip = 7 vertices (triangle strip)
constexpr sampler pitchSampler(address::clamp_to_edge, filter::linear);

static float2 pitchUV(float2 p, float2 size) {
    return float2(p.x / size.x + 0.5, p.y / size.y + 0.5);
}

vertex VertexOut grassVertex(uint vid                         [[vertex_id]],
                             uint iid                         [[instance_id]],
                             constant GrassUniforms&  u       [[buffer(0)]],
                             const device BladeInstance* blades [[buffer(1)]],
                             texture2d<float> pitchState      [[texture(0)]])
{
    const BladeInstance b = blades[iid];
    const float4 state = pitchState.sample(pitchSampler, pitchUV(b.position, u.pitchSize), level(0));
    const float moisture = state.r, water = state.g, wear = state.b, stripe = state.a;

    // Vertex layout of the strip: even ids on the left edge, odd on the right, last = tip.
    const uint  seg   = min(vid / 2, kSegments);
    const float t     = float(seg) / float(kSegments);       // 0 root .. 1 tip
    const float side  = (vid == 2 * kSegments) ? 0.0 : ((vid & 1) ? 0.5 : -0.5);

    // Worn turf is shorter; standing water and heavy wear lay the blades flat.
    const float height = u.bladeHeight * b.heightScale * (1.0 - 0.65 * wear);
    const float flatten = saturate(0.55 * water + 0.45 * wear + 0.15 * moisture);
    const float width = 0.0035 * (1.0 - t * 0.85);

    // Wind: gusting sway, scaled by blade stiffness; wet blades are heavier and sway less.
    const float phase = dot(b.position, u.windDirection) * 0.35 + u.time * 1.7;
    const float gust = 0.6 * sin(phase) + 0.4 * sin(phase * 2.31 + 1.3);
    const float sway = u.windStrength * gust / b.stiffness * (1.0 - 0.5 * moisture);

    // Quadratic bend: lean grows with t^2 so the root stays planted.
    const float2 bladeDir = float2(cos(b.rotation), sin(b.rotation));
    const float2 lean2 = (u.windDirection * sway + bladeDir * (0.25 + flatten * 1.4)) * (t * t);
    const float  up = height * t * (1.0 - 0.8 * flatten * t);

    const float2 across = float2(-bladeDir.y, bladeDir.x);
    const float3 world = float3(b.position + across * (side * width) + lean2 * height, up);

    // Distance LOD fade (the Grass Density setting picks lodNear/lodFar and instance count).
    const float dist = distance(world, u.cameraPosition);
    const float fade = 1.0 - smoothstep(u.lodNear, u.lodFar, dist);

    VertexOut out;
    out.position = u.viewProjection * float4(world * float3(1.0, 1.0, fade), 1.0);
    out.worldPosition = world;
    out.normal = normalize(float3(across * 0.2 + lean2 * 0.6, 1.0));
    out.heightFraction = t;
    out.wetness = moisture;
    out.water = water;
    out.wear = wear;
    out.stripe = stripe;
    out.colourVariation = b.colourVariation;
    out.fade = fade;
    return out;
}

fragment float4 grassFragment(VertexOut in [[stage_in]], constant GrassUniforms& u [[buffer(0)]])
{
    if (in.fade < 0.01) discard_fragment();

    // Albedo: dark root -> bright tip, mowing stripes, per-blade variation, worn -> soil.
    float3 root = float3(0.06, 0.20, 0.05);
    float3 tip  = float3(0.30, 0.55, 0.16);
    float3 albedo = mix(root, tip, in.heightFraction);
    albedo *= 1.0 + 0.08 * in.colourVariation;
    albedo *= mix(0.88, 1.08, in.stripe);
    albedo = mix(albedo, float3(0.32, 0.24, 0.15), saturate(in.wear * 1.2));   // exposed soil
    albedo *= 1.0 - 0.35 * in.wetness;                                       // wet = darker

    // Lighting: wrapped diffuse (thin blades transmit light) + wet specular sheen.
    const float3 n = normalize(in.normal);
    const float3 l = normalize(u.sunDirection);
    const float3 v = normalize(u.cameraPosition - in.worldPosition);
    const float diffuse = saturate((dot(n, l) + 0.4) / 1.4);
    const float3 h = normalize(l + v);
    const float gloss = mix(16.0, 96.0, saturate(in.wetness + in.water));
    const float spec = pow(saturate(dot(n, h)), gloss) * (0.04 + 0.6 * saturate(in.wetness * 0.6 + in.water));

    const float3 colour = albedo * (0.25 + diffuse * u.floodlightIntensity) + spec * u.floodlightIntensity;
    return float4(colour, in.fade);
}
