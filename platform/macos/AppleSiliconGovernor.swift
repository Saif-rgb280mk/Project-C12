// KINETIC XI — macOS platform layer (Swift)
// AppleSiliconGovernor.swift : detects the Mac the game runs on and keeps it cool and fast.
//   * Chip detection (M1/M2/M3/M4..., Base/Pro/Max/Ultra) from sysctl.
//   * Hardware ray tracing: Metal GPU family Apple 9 (M3 generation) and newer.
//   * Power source (AC vs battery), Low Power Mode and thermal state, observed live.
//   * Feeds the engine's applePreset() and DynamicResolutionController (see settings.hpp).
//   * Creates the simulation thread with the right quality-of-service so the 120 Hz physics
//     tick lands on performance cores.
// NOTE: requires the macOS SDK (swiftc / Xcode) — not compiled in the Linux container that
// produced the engine test results.

import Foundation
import IOKit.ps
import Metal

struct AppleHardwareInfo {
    enum ChipClass: String { case base = "Base", pro = "Pro", max = "Max", ultra = "Ultra" }

    let brand: String              // e.g. "Apple M3 Pro"
    let generation: Int            // 1 = M1, 2 = M2, ...
    let chipClass: ChipClass
    let hardwareRayTracing: Bool
    let gpuWorkingSetBytes: UInt64
    let proMotionDisplay: Bool
}

final class AppleSiliconGovernor {
    private(set) var hardware: AppleHardwareInfo
    private(set) var thermalState: Int = 0          // 0 nominal .. 3 critical
    private(set) var lowPowerMode: Bool = false
    private(set) var pluggedIn: Bool = true
    var onChange: (() -> Void)?
    private var observers: [NSObjectProtocol] = []

    init(device: MTLDevice? = MTLCreateSystemDefaultDevice(), proMotion: Bool) {
        let brand = AppleSiliconGovernor.sysctlString("machdep.cpu.brand_string") ?? "Apple M1"
        let (generation, chipClass) = AppleSiliconGovernor.parse(brand: brand)
        var hardwareRT = false
        if let device {
            if #available(macOS 14.0, *) {
                hardwareRT = device.supportsFamily(.apple9)   // M3 family and newer
            }
        }
        hardware = AppleHardwareInfo(brand: brand,
                                     generation: generation,
                                     chipClass: chipClass,
                                     hardwareRayTracing: hardwareRT,
                                     gpuWorkingSetBytes: device?.recommendedMaxWorkingSetSize ?? 0,
                                     proMotionDisplay: proMotion)
        refresh()
        let center = NotificationCenter.default
        observers.append(center.addObserver(forName: ProcessInfo.thermalStateDidChangeNotification,
                                            object: nil, queue: .main) { [weak self] _ in self?.refresh() })
        observers.append(center.addObserver(forName: Notification.Name.NSProcessInfoPowerStateDidChange,
                                            object: nil, queue: .main) { [weak self] _ in self?.refresh() })
    }

    deinit {
        for observer in observers { NotificationCenter.default.removeObserver(observer) }
    }

    /// Re-reads thermal state, Low Power Mode and the power source; notifies the renderer.
    func refresh() {
        thermalState = ProcessInfo.processInfo.thermalState.rawValue
        lowPowerMode = ProcessInfo.processInfo.isLowPowerModeEnabled
        pluggedIn = AppleSiliconGovernor.isOnACPower()
        onChange?()
    }

    /// Frame cap the governor recommends right now (0 = keep the user's choice).
    func recommendedFrameCap(userCap: Int) -> Int {
        if lowPowerMode { return 30 }
        switch thermalState {
        case 3: return 30
        case 2: return min(userCap == 0 ? 60 : userCap, 60)
        default: return pluggedIn ? 0 : min(userCap == 0 ? 60 : userCap, 60)
        }
    }

    /// Simulation thread at user-interactive QoS -> scheduled on performance cores.
    static func makeSimulationThread(_ body: @escaping () -> Void) -> Thread {
        let thread = Thread(block: body)
        thread.name = "KXI.Simulation"
        thread.qualityOfService = .userInteractive
        thread.stackSize = 8 << 20
        return thread
    }

    // MARK: - Helpers

    static func parse(brand: String) -> (Int, AppleHardwareInfo.ChipClass) {
        // "Apple M2 Max" -> (2, .max); unknown strings fall back to (1, .base)
        let parts = brand.split(separator: " ")
        var generation = 1
        if let m = parts.first(where: { $0.hasPrefix("M") && $0.count >= 2 }),
           let g = Int(m.dropFirst()) { generation = g }
        let chipClass: AppleHardwareInfo.ChipClass
        if brand.contains("Ultra") { chipClass = .ultra }
        else if brand.contains("Max") { chipClass = .max }
        else if brand.contains("Pro") { chipClass = .pro }
        else { chipClass = .base }
        return (generation, chipClass)
    }

    static func sysctlString(_ name: String) -> String? {
        var size = 0
        guard sysctlbyname(name, nil, &size, nil, 0) == 0, size > 0 else { return nil }
        var buffer = [CChar](repeating: 0, count: size)
        guard sysctlbyname(name, &buffer, &size, nil, 0) == 0 else { return nil }
        return String(cString: buffer)
    }

    static func isOnACPower() -> Bool {
        guard let snapshot = IOPSCopyPowerSourcesInfo()?.takeRetainedValue(),
              let typeRef = IOPSGetProvidingPowerSourceType(snapshot)?.takeUnretainedValue() else {
            return true   // desktops (Mac mini / Studio) report no battery: treat as AC
        }
        return (typeRef as String) == kIOPSACPowerValue
    }
}
