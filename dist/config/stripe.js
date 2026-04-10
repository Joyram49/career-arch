"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripe = void 0;
const stripe_1 = __importDefault(require("stripe"));
const env_1 = require("./env");
exports.stripe = new stripe_1.default(env_1.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-03-25.dahlia',
    typescript: true,
    appInfo: {
        name: 'CareerArch',
        version: '1.0.0',
    },
});
//# sourceMappingURL=stripe.js.map