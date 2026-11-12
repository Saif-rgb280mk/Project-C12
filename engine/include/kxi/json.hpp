// KINETIC XI — Engine Core
// json.hpp : a tiny, dependency-free JSON DOM (parse + pretty print). Used for settings,
// key bindings, tactical presets and telemetry. Object key order is preserved so files
// written by the game stay human-diffable.
#pragma once

#include <optional>
#include <string>
#include <string_view>
#include <utility>
#include <vector>

namespace kxi {

class Json {
public:
    enum class Type { Null, Bool, Number, String, Array, Object };

    Json() = default;
    static Json null() { return Json(); }
    static Json boolean(bool b) { Json j; j.type_ = Type::Bool; j.bool_ = b; return j; }
    static Json number(double n) { Json j; j.type_ = Type::Number; j.num_ = n; return j; }
    static Json string(std::string s) { Json j; j.type_ = Type::String; j.str_ = std::move(s); return j; }
    static Json array() { Json j; j.type_ = Type::Array; return j; }
    static Json object() { Json j; j.type_ = Type::Object; return j; }

    static std::optional<Json> parse(std::string_view text, std::string* error = nullptr);
    std::string dump(int indent = 2) const;

    Type type() const { return type_; }
    bool isNumber() const { return type_ == Type::Number; }
    bool isBool() const { return type_ == Type::Bool; }
    bool isString() const { return type_ == Type::String; }
    bool isObject() const { return type_ == Type::Object; }
    bool isArray() const { return type_ == Type::Array; }

    double asNumber(double fallback = 0.0) const { return isNumber() ? num_ : fallback; }
    bool asBool(bool fallback = false) const { return isBool() ? bool_ : fallback; }
    const std::string& asString() const { return str_; }

    const Json* get(std::string_view key) const;
    Json& set(const std::string& key, Json value);   // insert or replace, keeps order
    void push(Json value) { arr_.push_back(std::move(value)); }
    const std::vector<Json>& items() const { return arr_; }
    const std::vector<std::pair<std::string, Json>>& members() const { return obj_; }

private:
    void dumpTo(std::string& out, int indent, int depth) const;

    Type type_ = Type::Null;
    bool bool_ = false;
    double num_ = 0.0;
    std::string str_;
    std::vector<Json> arr_;
    std::vector<std::pair<std::string, Json>> obj_;
};

}  // namespace kxi
