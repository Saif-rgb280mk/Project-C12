# KINETIC XI — Engine Core build
# Builds a portable C++17 static library (macOS/Apple Silicon, Windows, Linux),
# the unit-test runner and the physics lab tool.
cmake_minimum_required(VERSION 3.16)
project(KineticXI_EngineCore LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

add_library(kxi_core STATIC
  src/surface.cpp
  src/ball_physics.cpp
  src/locomotion.cpp
  src/foot_ik.cpp
  src/fatigue.cpp
  src/input.cpp
  src/json.cpp
  src/settings.cpp
  src/tactics.cpp
  src/camera.cpp
)
target_include_directories(kxi_core PUBLIC include)

if(MSVC)
  target_compile_options(kxi_core PRIVATE /W4)
else()
  target_compile_options(kxi_core PRIVATE -Wall -Wextra -Wpedantic -Wshadow -Wconversion -Wno-sign-conversion)
endif()

# On Apple Silicon build a native arm64 slice (add x86_64 for a universal binary).
if(APPLE)
  set(CMAKE_OSX_ARCHITECTURES "arm64" CACHE STRING "")
endif()

add_executable(kxi_tests tests/tests.cpp)
target_link_libraries(kxi_tests PRIVATE kxi_core)

add_executable(kxi_lab tools/physics_lab.cpp)
target_link_libraries(kxi_lab PRIVATE kxi_core)

enable_testing()
add_test(NAME kxi_tests COMMAND kxi_tests)
