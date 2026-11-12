// KINETIC XI — Engine Core
// json.cpp : recursive-descent JSON parser and pretty printer.
#include "kxi/json.hpp"

#include <cctype>
#include <cmath>
#include <cstdio>
#include <cstdlib>

namespace kxi {
namespace {

struct Parser {
    std::string_view s;
    std::size_t i = 0;
    std::string error;

    void ws() {
        while (i < s.size() && (s[i] == ' ' || s[i] == '\n' || s[i] == '\r' || s[i] == '\t')) ++i;
    }
    bool fail(const std::string& msg) {
        if (error.empty()) error = msg + " at offset " + std::to_string(i);
        return false;
    }
    bool literal(std::string_view lit) {
        if (s.substr(i, lit.size()) == lit) { i += lit.size(); return true; }
        return false;
    }
    bool parseString(std::string& out) {
        if (i >= s.size() || s[i] != '"') return fail("expected string");
        ++i;
        while (i < s.size() && s[i] != '"') {
            char c = s[i++];
            if (c == '\\') {
                if (i >= s.size()) return fail("bad escape");
                const char e = s[i++];
                switch (e) {
                    case '"': out += '"'; break;
                    case '\\': out += '\\'; break;
                    case '/': out += '/'; break;
                    case 'b': out += '\b'; break;
                    case 'f': out += '\f'; break;
                    case 'n': out += '\n'; break;
                    case 'r': out += '\r'; break;
                    case 't': out += '\t'; break;
                    case 'u': {
                        if (i + 4 > s.size()) return fail("bad \\u escape");
                        const unsigned cp = static_cast<unsigned>(std::strtoul(std::string(s.substr(i, 4)).c_str(), nullptr, 16));
                        i += 4;
                        // UTF-8 encode (BMP only; surrogate pairs are not needed for settings files).
                        if (cp < 0x80) out += static_cast<char>(cp);
                        else if (cp < 0x800) { out += static_cast<char>(0xC0 | (cp >> 6)); out += static_cast<char>(0x80 | (cp & 0x3F)); }
                        else { out += static_cast<char>(0xE0 | (cp >> 12)); out += static_cast<char>(0x80 | ((cp >> 6) & 0x3F)); out += static_cast<char>(0x80 | (cp & 0x3F)); }
                        break;
                    }
                    default: return fail("bad escape");
                }
            } else {
                out += c;
            }
        }
        if (i >= s.size()) return fail("unterminated string");
        ++i;
        return true;
    }
    bool parseValue(Json& out, int depth) {
        if (depth > 64) return fail("nesting too deep");
        ws();
        if (i >= s.size()) return fail("unexpected end");
        const char c = s[i];
        if (c == '{') {
            ++i;
            out = Json::object();
            ws();
            if (i < s.size() && s[i] == '}') { ++i; return true; }
            while (true) {
                ws();
                std::string key;
                if (!parseString(key)) return false;
                ws();
                if (i >= s.size() || s[i] != ':') return fail("expected ':'");
                ++i;
                Json v;
                if (!parseValue(v, depth + 1)) return false;
                out.set(key, std::move(v));
                ws();
                if (i < s.size() && s[i] == ',') { ++i; continue; }
                if (i < s.size() && s[i] == '}') { ++i; return true; }
                return fail("expected ',' or '}'");
            }
        }
        if (c == '[') {
            ++i;
            out = Json::array();
            ws();
            if (i < s.size() && s[i] == ']') { ++i; return true; }
            while (true) {
                Json v;
                if (!parseValue(v, depth + 1)) return false;
                out.push(std::move(v));
                ws();
                if (i < s.size() && s[i] == ',') { ++i; continue; }
                if (i < s.size() && s[i] == ']') { ++i; return true; }
                return fail("expected ',' or ']'");
            }
        }
        if (c == '"') {
            std::string str;
            if (!parseString(str)) return false;
            out = Json::string(std::move(str));
            return true;
        }
        if (literal("true")) { out = Json::boolean(true); return true; }
        if (literal("false")) { out = Json::boolean(false); return true; }
        if (literal("null")) { out = Json::null(); return true; }
        // number
        const std::size_t start = i;
        if (i < s.size() && (s[i] == '-' || s[i] == '+')) ++i;
        while (i < s.size() && (std::isdigit(static_cast<unsigned char>(s[i])) || s[i] == '.' ||
                                s[i] == 'e' || s[i] == 'E' || s[i] == '-' || s[i] == '+'))
            ++i;
        if (start == i) return fail("unexpected character");
        const std::string num(s.substr(start, i - start));
        char* end = nullptr;
        const double v = std::strtod(num.c_str(), &end);
        if (end == num.c_str()) return fail("bad number");
        out = Json::number(v);
        return true;
    }
};

void escapeTo(std::string& out, const std::string& s) {
    out += '"';
    for (const char c : s) {
        switch (c) {
            case '"': out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\n': out += "\\n"; break;
            case '\t': out += "\\t"; break;
            case '\r': out += "\\r"; break;
            default: out += c;
        }
    }
    out += '"';
}

}  // namespace

std::optional<Json> Json::parse(std::string_view text, std::string* error) {
    Parser p;
    p.s = text;
    Json root;
    if (!p.parseValue(root, 0)) {
        if (error) *error = p.error;
        return std::nullopt;
    }
    p.ws();
    if (p.i != text.size()) {
        if (error) *error = "trailing characters at offset " + std::to_string(p.i);
        return std::nullopt;
    }
    return root;
}

const Json* Json::get(std::string_view key) const {
    for (const auto& [k, v] : obj_)
        if (k == key) return &v;
    return nullptr;
}

Json& Json::set(const std::string& key, Json value) {
    for (auto& [k, v] : obj_)
        if (k == key) { v = std::move(value); return v; }
    obj_.emplace_back(key, std::move(value));
    return obj_.back().second;
}

void Json::dumpTo(std::string& out, int indent, int depth) const {
    const std::string pad(static_cast<std::size_t>(indent * (depth + 1)), ' ');
    const std::string padEnd(static_cast<std::size_t>(indent * depth), ' ');
    switch (type_) {
        case Type::Null: out += "null"; break;
        case Type::Bool: out += bool_ ? "true" : "false"; break;
        case Type::Number: {
            if (std::floor(num_) == num_ && std::abs(num_) < 1e15) {
                out += std::to_string(static_cast<long long>(num_));
            } else {
                char buf[32];
                std::snprintf(buf, sizeof(buf), "%.6g", num_);
                out += buf;
            }
            break;
        }
        case Type::String: escapeTo(out, str_); break;
        case Type::Array:
            if (arr_.empty()) { out += "[]"; break; }
            out += "[\n";
            for (std::size_t k = 0; k < arr_.size(); ++k) {
                out += pad;
                arr_[k].dumpTo(out, indent, depth + 1);
                out += (k + 1 < arr_.size()) ? ",\n" : "\n";
            }
            out += padEnd + "]";
            break;
        case Type::Object:
            if (obj_.empty()) { out += "{}"; break; }
            out += "{\n";
            for (std::size_t k = 0; k < obj_.size(); ++k) {
                out += pad;
                escapeTo(out, obj_[k].first);
                out += ": ";
                obj_[k].second.dumpTo(out, indent, depth + 1);
                out += (k + 1 < obj_.size()) ? ",\n" : "\n";
            }
            out += padEnd + "}";
            break;
    }
}

std::string Json::dump(int indent) const {
    std::string out;
    dumpTo(out, indent, 0);
    return out;
}

}  // namespace kxi
