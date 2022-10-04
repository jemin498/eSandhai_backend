const mongoose = require('mongoose');
// const bcrypt = require('bcrypt');
const addressSchema = mongoose.Schema({
    addressType: {
        type: String,
        enum: ["Home", "Office", "Other"]
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    pincode: {
        type: String
    },
    houseNo: {
        type: String
    },
    street: {
        type: String
    },
    placeName: {
        type: String
    },
    placeAddress: {
        type: String
    },
    district: {
        type: String
    },
    locality: {
        type: String
    },
    landmark: {
        type: String
    },
    mobileNo: {
        type: String
    },
    lat: Number,
    long: Number,
    city: String,
    region: String,
    country: String,
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "users"
    }
}, { timestamps: true });

module.exports = mongoose.model("address", addressSchema);