/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: validator.js
 * Layer: Utils
 * Responsibility:
 * - Shared validation rules used across all module forms
 * ---------------------------------------------------------
 * Version: 0.1.0
 * ---------------------------------------------------------
 */

const Validator = {
    isRequired(value) {
        return value !== null && value !== undefined && String(value).trim() !== "";
    },

    isPhone(value) {
        return /^01\d{9}$/.test(String(value || "").trim());
    },

    isEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
    },

    isNumber(value) {
        return value !== "" && !isNaN(Number(value));
    },

    minLength(value, length) {
        return String(value || "").trim().length >= length;
    },

    /**
     * يشغّل مجموعة قواعد على object واحد ويرجع { valid, errors }
     * rules شكلها: { fieldName: [{ test: fn, message: "..." }] }
     */
    validate(data, rules) {
        const errors = {};

        Object.keys(rules).forEach((field) => {
            for (const rule of rules[field]) {
                if (!rule.test(data[field])) {
                    errors[field] = rule.message;
                    break;
                }
            }
        });

        return {
            valid: Object.keys(errors).length === 0,
            errors
        };
    }
};

export default Validator;
