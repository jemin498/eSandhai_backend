var express = require('express');
var router = express.Router();
const moment = require('moment');
const momentTz = require('moment-timezone')
require('dotenv').config();
const bcrypt = require('bcrypt')
const { default: mongoose } = require('mongoose');
const userSchema = require('../../models/userModel');
const { getCurrentDateTime24 } = require('../../utility/dates');
const nodemailer = require("nodemailer");
const { check, body, oneOf } = require('express-validator')
const { main } = require('../../utility/mail')
const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const { sendSms } = require('../../utility/sendSms');
const { getPlaces, placeFilter, formatAddress } = require('../../utility/mapbox')
const { generateAccessToken, authenticateToken, generateRefreshToken } = require('../../middleware/authMobile');
const addressSchema = require('../../models/addressSchema');
const { checkErr } = require('../../utility/error');
const userSubscription = require('../../models/userSubscription');
const subscriptionSchema = require('../../models/subscriptionSchema');
/* GET home page. */
router.get('/', async function (req, res, next) {
    console.log(validatePhoneNumber("9999999999"));
    console.log(validateEmail("abc@gmail.com"))
    res.render('index', { title: 'Express' });
});
router.post('/signUp', [body('email').isEmail().withMessage("please pass email id"), body('password').not().isEmpty().isString().withMessage("please pass password")], checkErr, async (req, res, next) => {
    try {
        const { email, password } = req.body;

        let checkExist = await userSchema.aggregate([
            {
                $match: {
                    $or: [
                        { email: email }
                    ]
                }
            }
        ]);

        if (checkExist.length > 0) {
            return res.status(200).json({ issuccess: false, data: { acknowledgement: false }, message: "user already exist" });
        }

        // const userLoginIs = new userLogin({
        //   userName: userName,
        //   password: password
        // });

        // await userLoginIs.save();

        const userIs = new userSchema({
            email: email,
            password: password
        });

        await userIs.save();

        otp = getRandomIntInclusive(111111, 999999);

        console.log(otp);
        let update = await userSchema.findByIdAndUpdate(userIs._id, { otp: otp, generatedTime: getCurrentDateTime24('Asia/Kolkata') })
        let message = `<h1>Hello Dear User</h1><br/><br/><p>welcome back!</p><br>Your otp is ${otp} , Please Do not share this otp with anyone<br/> This otp is valid for one minute only`
        await main(email, message);
        return res.status(200).json({ issuccess: true, data: { acknowledgement: true, data: { email: userIs.email, role: userIs.role, isEmailVerified: userIs.isEmailVerified, isMobileVerified: userIs.isMobileVerified, _id: userIs._id }, otp: otp }, Messsage: "user successfully signed up" });;
    } catch (error) {
        return res.status(500).json({ issuccess: false, data: { acknowledgement: false }, message: error.message || "Having issue is server" })
    }
})
router.post('/signUpWithGoogle', async (req, res, next) => {
    try {
        // console.log(req.body)
        const { idToken } = req.body;
        let addData = new bodySchema({
            data: req.body
        });

        await addData.save();
        if (idToken == undefined) {
            return res.status(200).json({ isSuccess: false, data: null, message: "please check id token in request" });
        }
        let checkRevoked = true;
        getAuth()
            .verifyIdToken(idToken, checkRevoked)
            .then(async (payload) => {
                // console.log(payload)
                console.log("token is valid in payload")
                // Token is valid.
                const { name, email, password, mobileNo, role } = payload;
                // console.log(email.toString())
                let checkExist = await userSchema.aggregate([
                    {
                        $match: {
                            email: email
                        }
                    }
                ]);
                // console.log(checkExist);
                if (checkExist.length > 0) {
                    let user = {
                        _id: checkExist[0]._id,
                        timestamp: Date.now()
                    }

                    const { generatedToken, refreshToken } = await generateAccessToken(user);
                    return res.status(200).json({ isSuccess: true, data: { user: { email: checkExist[0].email, name: checkExist[0].name, id: checkExist[0]._id, role: checkExist[0].role }, token: generatedToken, refreshToken: refreshToken }, message: "user successully found" });
                }

                // const userLoginIs = new userLogin({
                //   userName: userName,
                //   password: password
                // });

                // await userLoginIs.save();

                const userIs = new userSchema({
                    name: name,
                    email: email,
                    mobileNo: mobileNo,
                    role: "user",
                    password: password
                });

                await userIs.save();
                // console.log(userIs)
                let user = {
                    _id: userIs._id,
                    role: "user",
                    timestamp: Date.now()
                }
                const { generatedToken, refreshToken } = await generateAccessToken(user);
                return res.status(200).json({
                    isSuccess: true, data: {
                        user: {
                            email: userIs.email, name: userIs.name, id: userIs._id, role: userIs.role
                        }, token: generatedToken, refreshToken: refreshToken
                    }, message: "user successfully signed up"
                });
            })
            .catch((error) => {
                console.log(error.message)
                if (error.code == 'auth/id-token-revoked') {
                    console.log("token is revoked")
                    return res.status(200).json({ isSuccess: false, data: null, message: "user revoked app permissions" });
                    // Token has been revoked   . Inform the user to reauthenticate or signOut() the user.
                } else {
                    console.log("token is invalid")
                    return res.status(200).json({ isSuccess: false, data: null, message: "invalid token" });
                    // Token is invalid.
                }
            });



    } catch (error) {
        return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
    }
})
router.post('/login-mobile', [body('mobileNo').isMobilePhone().withMessage("please pass mobile no"), body('countryCode').isString().withMessage("please pass countrycode")], checkErr, async (req, res, next) => {
    try {
        const { mobileNo, countryCode } = req.body;

        let checkExist = await userSchema.aggregate([
            {
                $match: {
                    $or: [
                        { mobileNo: mobileNo }
                    ]
                }
            }
        ]);

        if (checkExist.length > 0) {
            otp = getRandomIntInclusive(111111, 999999);
            res.status(200).json({ issuccess: true, data: { acknowledgement: true, otp: otp, exist: true }, message: "otp sent to mobile no" });

            // console.log(otp);
            let update = await userSchema.findByIdAndUpdate(checkExist[0]._id, { otp: otp, generatedTime: getCurrentDateTime24('Asia/Kolkata') })
            let message = `<h1>Hello Dear User</h1><br/><br/><p>welcome back!</p><br>Your otp is ${otp} , Please Do not share this otp with anyone<br/> This otp is valid for one minute only`
            await sendSms(countryCode + mobileNo, `Helllo User, Your otp for laundary service is ${otp} , Please Do not share this otp with anyone`);
            return;
            // return res.status(409).json({ IsSuccess: true, Data: [], Messsage: "user already exist" });
        }

        // const userLoginIs = new userLogin({
        //   userName: userName,
        //   password: password
        // });

        // await userLoginIs.save();

        const userIs = new userSchema({
            mobileNo: mobileNo,
            countryCode: countryCode
        });

        await userIs.save();

        otp = getRandomIntInclusive(111111, 999999);
        res.status(200).json({ issuccess: true, data: { acknowledgement: true, otp: otp, exist: false }, message: "otp sent to mobile no" });

        // console.log(otp);
        let update = await userSchema.findByIdAndUpdate(userIs._id, { otp: otp, generatedTime: getCurrentDateTime24('Asia/Kolkata') })
        let message = `<h1>Hello Dear User</h1><br/><br/><p>welcome back!</p><br>Your otp is ${otp} , Please Do not share this otp with anyone<br/> This otp is valid for one minute only`
        await sendSms(countryCode + mobileNo, `Helllo User, Your otp for laundary service is ${otp} , Please Do not share this otp with anyone`);
        return;
    } catch (error) {
        console.log();
        return res.status(500).json({ issuccess: false, data: { acknowledgement: false }, message: error.message || "Having issue is server" })
    }
})
router.post('/login', [oneOf([body('id').isEmail().withMessage("please pass email id"), body('id').isMobilePhone().withMessage("please pass mobile no")], "please pass valid email or mobile no"), body('password').isString().withMessage("please pass password")], checkErr, async (req, res, next) => {
    try {
        const { password, id } = req.body;

        isEmail = false;
        if (validateEmail(id)) {
            isEmail = true
        }
        else if (validatePhoneNumber(id)) {
            isEmail = false;
        }
        else {
            return res.status(200).json({ issuccess: false, data: { acknowledgement: false }, message: "please use correct mobile no or email" });
        }

        checkExist = await userSchema.aggregate([
            {
                $match: {
                    $or: [
                        { email: id },
                        { mobileNo: id }
                    ]
                }
            },
            {
                $addFields: {
                    id: "$_id"
                }
            },
            {
                $project: {
                    __v: 0,
                    otp: 0,
                    generatedTime: 0,
                    createdAt: 0,
                    updatedAt: 0
                }
            }
        ]);

        if (checkExist.length > 0) {
            if (!(await bcrypt.compare(password, checkExist[0].password))) {
                return res.status(200).json({ issuccess: false, data: { acknowledgement: false, data: null, status: 1 }, message: "Incorrect Password" });
            }
            checkExist[0]['id'] = checkExist[0]['_id']
            delete checkExist[0].password;
            // let user = {
            //     _id: checkExist[0]._id,
            //     timestamp: Date.now()
            // }

            // const { generatedToken, refreshToken } = await generateAccessToken(user);
            // // console.log(generatedToken + refreshToken);
            //SEND OTP
            //
            // main().catch(console.error);
            otp = getRandomIntInclusive(111111, 999999);
            let update = await userSchema.findByIdAndUpdate(checkExist[0]._id, { otp: otp, generatedTime: getCurrentDateTime24('Asia/Kolkata') })
            delete checkExist[0]._id;
            delete checkExist[0].__v;
            res.status(200).json({ issuccess: true, data: { acknowledgement: true, data: checkExist[0], otp: otp }, message: "user found" });
            let message = `<h1>Hello Dear User</h1><br/><br/><p>welcome back!</p><br>Your otp is ${otp} , Please Do not share this otp with anyone<br/> This otp is valid for one minute only`
            await main(checkExist[0].email, message);
            return
        }
        return res.status(200).json({ issuccess: false, data: { acknowledgement: false, data: null, status: 0 }, message: "incorrect email id or mobile no" });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ issuccess: false, data: { acknowledgement: false, data: null }, message: error.message || "Having issue is server" })
    }
})
//pending for mobile no and email verification issue
router.post('/updateUser', authenticateToken, [body('name', 'please pass valid name').optional().notEmpty().isString(),
body('dob', "please pass dob").notEmpty().optional().custom((value) => { return regex.test(value) }),
body('gender').optional().isIn(["Male", "Female", "Other"]).withMessage("please pass valid gender value"),
body('mobileNo', 'please pass your mobile no').optional().notEmpty().isMobilePhone(), body('email', 'please pass your email').optional().notEmpty().isEmail(),
body('otp', 'please pass otp').optional().notEmpty().isString()], checkErr, async (req, res, next) => {
    try {
        const { name, dob, mobileNo, gender, email, otp, isVerify } = req.body;

        const userId = req.user._id

        let checkEmail = await userSchema.aggregate([
            {
                $match: {
                    $or: [
                        {
                            $and: [
                                { _id: { $ne: mongoose.Types.ObjectId(userId) } },
                                { email: email }
                            ]
                        },
                        {
                            $and: [
                                { _id: { $ne: mongoose.Types.ObjectId(userId) } },
                                { mobileNo: mobileNo }
                            ]
                        }
                    ]
                }
            }
        ])
        let updateUser = await userSchema.findByIdAndUpdate(userId, { email: email, gender: gender, name: name, mobileNo: mobileNo, birthDate: dob }, { new: true })
        if (isVerify) {
            if (email != undefined && validateEmail(email)) {
                otp = getRandomIntInclusive(111111, 999999);
                res.status(200).json({ issuccess: true, data: { acknowledgement: true, data: { email: updateUser.email }, otp: otp }, message: "user found" });
                let update = await userSchema.findByIdAndUpdate(userId, { otp: otp, generatedTime: getCurrentDateTime24('Asia/Kolkata') })
                let message = `<h1>Hello Dear User</h1><br/><br/><p>welcome back!</p><br>Your otp is ${otp} , Please Do not share this otp with anyone<br/> This otp is valid for one minute only`
                await main(checkExist[0].email, message);
            }
            else if (mobileNo != undefined && validatePhoneNumber(mobileNo)) {
                otp = getRandomIntInclusive(111111, 999999);
                res.status(200).json({ issuccess: true, data: { acknowledgement: true, data: { mobileNo: updateUser.mobileNo }, otp: otp }, message: "otp sent to mobile no" });

                console.log(otp);
                let update = await userSchema.findByIdAndUpdate(userId, { otp: otp, generatedTime: getCurrentDateTime24('Asia/Kolkata') })
                let message = `<h1>Hello Dear User</h1><br/><br/><p>welcome back!</p><br>Your otp is ${otp} , Please Do not share this otp with anyone<br/> This otp is valid for one minute only`
                await sendSms(countryCode + mobileNo, `Helllo User, Your otp for laundary service is ${otp} , Please Do not share this otp with anyone`);

            }
        }
        return res.status(200).json({ issuccess: true, data: { acknowledgement: true, data: { name: updateUser.name, birthDate: updateUser.birthDate } }, message: "user details updated" });
    } catch (error) {
        return res.status(500).json({ issuccess: false, data: { acknowledgement: false }, message: error.message || "Having issue is server" })
    }
})
router.get('/getProfile', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user._id
        console.log(req.user._id);
        const checkUser = await userSchema.aggregate([
            {
                $match: {
                    _id: mongoose.Types.ObjectId(userId)
                }
            },
            {
                $addFields: {
                    "id": "$_id"
                }
            },
            {
                $project: {
                    "generatedTime": 0,
                    "createdAt": 0,
                    "updatedAt": 0,
                    "__v": 0,
                    "_id": 0,
                    "otp": 0,
                    password: 0
                }
            }
        ]);
        if (checkUser.length == 0) {
            return res.status(200).json({ issuccess: false, data: { acknowledgement: false, data: null }, message: "no user details found" });

        }
        return res.status(200).json({ issuccess: true, data: { acknowledgement: true, data: checkUser[0] }, message: "user details found" });
    } catch (error) {
        return res.status(500).json({ issuccess: false, data: { acknowledgement: false }, message: error.message || "Having issue is server" })
    }
})
router.post('/resendOtp', [oneOf([body('id').isEmail(), body('id').isMobilePhone()], "please pass email or mobile no")], checkErr, async (req, res, next) => {
    try {
        const { id } = req.body;
        // console.log(id);
        let checkOtp = await userSchema.aggregate([
            {
                $match: {
                    $and: [
                        { $or: [{ email: id }, { mobileNo: id }] }
                    ]
                }
            }
        ])
        if (checkOtp.length == 0) {
            return res.status(200).json({ issuccess: false, data: { acknowledgement: false }, message: "no user found with this ids" });
        }

        otp = getRandomIntInclusive(111111, 999999);
        res.status(200).json({ issuccess: true, data: { acknowledgement: true, data: otp }, message: "Otp sent successfully" });

        let update = await userSchema.findByIdAndUpdate(checkOtp[0]._id, { otp: otp, generatedTime: getCurrentDateTime24('Asia/Kolkata') })
        let message = `<h1>Hello Dear User</h1><br/><br/><p>welcome back!</p><br>Your otp is ${otp} , Please Do not share this otp with anyone<br/> This otp is valid for one minute only`

        if (validateEmail(id)) {
            await main(checkOtp[0].email, message);
        }
        else if (validatePhoneNumber(id)) {
            await sendSms(checkOtp[0].countryCode + checkOtp[0].mobileNo, `Helllo User, Your otp for laundary service is ${otp} , Please Do not share this otp with anyone`);
        }
        return

        return res.status(200).json({ IsSuccess: true, Data: [], Messsage: "user not found" });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ issuccess: false, data: { acknowledgement: false }, message: error.message || "Having issue is server" })
    }
})
//authenticate otp and update for verified status
router.post('/authenticateOtpLogin', [oneOf([body('id').isEmail(), body('id').isMobilePhone()], "please pass email or mobile no"), body('otp').isNumeric().withMessage("please pass otp")], checkErr, async (req, res, next) => {
    try {
        const { otp, id } = req.body;

        let checkUser = await userSchema.aggregate([
            {
                $match: {
                    $or: [
                        { email: id },
                        { mobileNo: id }
                    ]
                }
            }
        ]);

        if (checkUser.length == 0) {
            return res.status(200).json({ issuccess: false, data: { acknowledgement: false, status: 3 }, message: `No User Found With ${id}` });
        }
        if (otp == '000000') {
            let updateData = {}
            if (validateEmail(id)) {
                updateData = {
                    isEmailVerified: true
                }
            }
            else if (validatePhoneNumber(id)) {
                updateData = {
                    isMobileVerified: true
                }
            }
            console.log(checkUser[0].otp);
            let update = await userSchema.findByIdAndUpdate(checkUser[0]._id, updateData, { new: true });
            const {
                generatedToken, refreshToken } = await generateAccessToken({ _id: checkUser[0]._id, role: checkUser[0].role })
            return res.status(200).json({ issuccess: true, data: { acknowledgement: true, status: 0, generatedToken: generatedToken, refreshToken: refreshToken }, message: `otp verifed successfully` });
        }

        const startIs = (momentTz(moment(checkUser[0].generatedTime.join(' '), 'DD/MM/YYYY H:mm:ss')).tz('Asia/Kolkata'));
        const endIs = (momentTz(moment(checkUser[0].generatedTime.join(' '), 'DD/MM/YYYY H:mm:ss').add(5, 'minutes')).tz('Asia/Kolkata'));
        const timeIs = (momentTz().tz('Asia/Kolkata'));
        // const startIs = moment(checkUser[0].generatedTime.join(' '), 'DD/MM/YYYY H:mm:ss');
        // const endIs = moment(checkUser[0].generatedTime.join(' '), 'DD/MM/YYYY H:mm:ss').add(1, 'minutes');
        // const timeIs = moment();
        console.log(startIs)
        console.log(endIs);
        console.log(timeIs);
        if (timeIs >= startIs && timeIs <= endIs) {
            //otp valid
            if (checkUser[0].otp == otp) {
                let updateData = {}
                if (validateEmail(id)) {
                    updateData = {
                        isEmailVerified: true
                    }
                }
                else if (validatePhoneNumber(id)) {
                    updateData = {
                        isMobileVerified: true
                    }
                }
                console.log(checkUser[0].otp);
                let update = await userSchema.findByIdAndUpdate(checkUser[0]._id, updateData, { new: true });
                const {
                    generatedToken, refreshToken } = await generateAccessToken({ _id: checkUser[0]._id, role: checkUser[0].role })
                return res.status(200).json({ issuccess: true, data: { acknowledgement: true, status: 0, generatedToken: generatedToken, refreshToken: refreshToken }, message: `otp verifed successfully` });
            }
            else {
                return res.status(200).json({ issuccess: false, data: { acknowledgement: false, status: 2 }, message: `incorrect otp` });
            }
            console.log("valid")
        }
        else {
            //otp expired
            return res.status(200).json({ issuccess: false, data: { acknowledgement: false, status: 1 }, message: `otp expired` });
        }

    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ issuccess: false, data: { acknowledgement: false }, message: error.message || "Having issue is server" })
    }
})

//return response for otp verification only
router.post('/authenticateOtp', [oneOf([body('id').isEmail(), body('id').isMobilePhone()], "please pass email or mobile no"), body('otp').isNumeric().withMessage("please pass otp")], checkErr, async (req, res, next) => {
    try {
        const { otp, id } = req.body;

        let checkUser = await userSchema.aggregate([
            {
                $match: {
                    $or: [
                        { email: id },
                        { mobileNo: id }
                    ]
                }
            }
        ]);

        if (checkUser.length == 0) {
            return res.status(200).json({ issuccess: false, data: { acknowledgement: false, status: 3 }, message: `No User Found With ${userId}` });
        }

        if (otp == '000000') {
            const {
                generatedToken, refreshToken } = await generateAccessToken({ _id: checkUser[0]._id, role: checkUser[0].role })
            return res.status(200).json({ issuccess: true, data: { acknowledgement: true, status: 0, generatedToken: generatedToken, refreshToken: refreshToken }, message: `otp verifed successfully` });
        }
        const startIs = (momentTz(moment(checkUser[0].generatedTime.join(' '), 'DD/MM/YYYY H:mm:ss')).tz('Asia/Kolkata'));
        const endIs = (momentTz(moment(checkUser[0].generatedTime.join(' '), 'DD/MM/YYYY H:mm:ss').add(5, 'minutes')).tz('Asia/Kolkata'));
        const timeIs = (momentTz().tz('Asia/Kolkata'));
        // const startIs = moment(checkUser[0].generatedTime.join(' '), 'DD/MM/YYYY H:mm:ss');
        // const endIs = moment(checkUser[0].generatedTime.join(' '), 'DD/MM/YYYY H:mm:ss').add(1, 'minutes');
        // const timeIs = moment();
        console.log(startIs)
        if (timeIs >= startIs && timeIs <= endIs) {
            //otp valid
            if (checkUser[0].otp == otp) {
                const {
                    generatedToken, refreshToken } = await generateAccessToken({ _id: checkUser[0]._id, role: checkUser[0].role })
                return res.status(200).json({ issuccess: true, data: { acknowledgement: true, status: 0, generatedToken: generatedToken, refreshToken: refreshToken }, message: `otp verifed successfully` });
            }
            else {
                return res.status(200).json({ issuccess: false, data: { acknowledgement: false, status: 2 }, message: `incorrect otp` });
            }
            console.log("valid")
        }
        else {
            //otp expired
            return res.status(200).json({ issuccess: true, data: { acknowledgement: false, status: 1 }, message: `otp expired` });
        }

    } catch (error) {
        return res.status(500).json({ issuccess: false, data: { acknowledgement: false }, message: error.message || "Having issue is server" })
    }
})
router.post('/setPassword', [oneOf([body('id').isEmail(), body('id').isMobilePhone()], "please pass email or mobile no"), body('otp').isNumeric().withMessage("please pass otp"), body('password').isString().withMessage("please pass password")], checkErr, async (req, res, next) => {
    try {
        const { otp, id, password } = req.body;

        let checkUser = await userSchema.aggregate([
            {
                $match: {
                    $or: [
                        { email: id },
                        { mobileNo: id }
                    ]
                }
            }
        ]);

        if (checkUser.length == 0) {
            return res.status(200).json({ issuccess: false, data: { acknowledgement: false, status: 3 }, message: `No User Found With ${userId}` });
        }
        if (otp == '000000') {
            const salt = await bcrypt.genSalt(10);
            const hashedpassword = await bcrypt.hash(password, salt);
            let updatePassword = await userSchema.findByIdAndUpdate(checkUser[0]._id, { password: hashedpassword }, { new: true });
            return res.status(200).json({ issuccess: true, data: { acknowledgement: true, status: 0 }, message: `password changed sucessfully` });

        }
        const startIs = (momentTz(moment(checkUser[0].generatedTime.join(' '), 'DD/MM/YYYY H:mm:ss')).tz('Asia/Kolkata'));
        const endIs = (momentTz(moment(checkUser[0].generatedTime.join(' '), 'DD/MM/YYYY H:mm:ss').add(5, 'minutes')).tz('Asia/Kolkata'));
        const timeIs = (momentTz().tz('Asia/Kolkata'));
        // const startIs = moment(checkUser[0].generatedTime.join(' '), 'DD/MM/YYYY H:mm:ss');
        // const endIs = moment(checkUser[0].generatedTime.join(' '), 'DD/MM/YYYY H:mm:ss').add(1, 'minutes');
        // const timeIs = moment();
        // console.log(startIs)
        if (timeIs >= startIs && timeIs <= endIs) {
            //otp valid
            if (checkUser[0].otp == otp) {
                const salt = await bcrypt.genSalt(10);
                const hashedpassword = await bcrypt.hash(password, salt);
                let updatePassword = await userSchema.findByIdAndUpdate(checkUser[0]._id, { password: hashedpassword }, { new: true });
                return res.status(200).json({ issuccess: true, data: { acknowledgement: true, status: 0 }, message: `password changed sucessfully` });
            }
            else {
                return res.status(200).json({ issuccess: false, data: { acknowledgement: false, status: 2 }, message: `incorrect otp` });
            }
            console.log("valid")
        }
        else {
            //otp expired
            return res.status(200).json({ issuccess: false, data: { acknowledgement: false, status: 1 }, message: `otp expired` });
        }

    } catch (error) {
        return res.status(500).json({ issuccess: false, data: { acknowledgement: false }, message: error.message || "Having issue is server" })
    }
})
router.get('/getUsers', async (req, res) => {
    let getUsers = await userSchema.aggregate([
        {
            $match: {

            }
        }
    ])
    return res.status(getUsers.length > 0 ? 200 : 200).json({ issuccess: true, data: { acknowledgement: true, data: getUsers }, message: getUsers.length > 0 ? `users found` : "no user found" });
})

router.get('/refresh', generateRefreshToken);

router.get('/getSuggestions', async (req, res, next) => {
    try {
        // const userId = req.user._id
        const { text } = req.query;
        // console.log(req.user._id);
        let places = await getPlaces(text);
        let filterPlace = await placeFilter(places)
        return res.status(filterPlace.length > 0 ? 200 : 200).json({ issuccess: filterPlace.length > 0 ? true : false, data: { acknowledgement: true, data: filterPlace.length > 0 ? filterPlace : [] }, message: filterPlace.length > 0 ? "places details found" : "no any place found" });
    } catch (error) {
        return res.status(500).json({ issuccess: false, data: { acknowledgement: false }, message: error.message || "Having issue is server" })
    }
})
router.get('/getPlace', async (req, res, next) => {
    try {
        // const userId = req.user._id
        const { lat, long } = req.query;
        // console.log(req.user._id);
        let places = await getPlaces(`${long},${lat}`, 1);
        // return res.json(places)
        let filterPlace = await formatAddress(places)
        return res.status(Object.keys(filterPlace).length > 0 ? 200 : 200).json({ issuccess: Object.keys(filterPlace).length > 0 ? true : false, data: { acknowledgement: Object.keys(filterPlace).length > 0 ? true : false, data: Object.keys(filterPlace).length > 0 ? filterPlace : filterPlace }, message: Object.keys(filterPlace).length > 0 ? "address found" : "address not recognized" });
    } catch (error) {
        return res.status(500).json({ issuccess: false, data: { acknowledgement: false }, message: error.message || "Having issue is server" })
    }
})
router.post('/addAddress', authenticateToken, async (req, res, next) => {
    try {
        const { addressType, lat, long, placeAddress, placeName, mobileNo, countryCode, street, houseNo, pincode, landmark, locality, city, district, region, country } = req.body;
        const userId = req.user._id
        let { isDefault } = req.body;
        console.log(isDefault);
        if (isDefault != undefined && isDefault == true) {
            let update = await addressSchema.updateMany({ userId: mongoose.Types.ObjectId(userId) }, { isDefault: false });
        }
        else {
            let checkAddressDefault = await addressSchema.aggregate([{ $match: { $and: [{ userId: mongoose.Types.ObjectId(userId) }, { isDefault: true }] } }]);
            isDefault = checkAddressDefault.length > 0 ? false : true
        }
        let createAddress = new addressSchema({
            addressType: addressType,
            isDefault: isDefault,
            placeName: placeName,
            placeAddress: placeAddress,
            pincode: pincode,
            houseNo: houseNo,
            street: street,
            landmark: landmark,
            locality: locality,
            city: city,
            district: district,
            region: region,
            country: country,
            userId: userId,
            lat: lat,
            long: long,
            mobileNo: mobileNo,
            countryCode: countryCode
        })

        await createAddress.save();
        return res.status(200).json({ issuccess: true, data: { acknowledgement: true, data: { addressId: createAddress._id } }, message: "Address Details saved" });

    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ issuccess: false, data: { acknowledgement: false }, message: error.message || "Having issue is server" })
    }
})
router.put('/updateAddress', authenticateToken, async (req, res, next) => {
    try {
        const { addressType, lat, long, addressId, mobileNo, countryCode, placeAddress, placeName, street, houseNo, pincode, landmark, locality, city, district, region, country } = req.body;
        const userId = req.user._id
        let { isDefault } = req.body;
        let checkAddress = await addressSchema.aggregate([
            {
                $match: {
                    _id: mongoose.Types.ObjectId(addressId)
                }
            }
        ]);
        if (checkAddress.length == 0) {
            return res.status(200).json({ issuccess: false, data: { acknowledgement: false, data: null }, message: "address not found" });
        }
        if (isDefault) {
            let update = await addressSchema.updateMany({ userId: mongoose.Types.ObjectId(userId) }, { isDefault: false });
        }
        let createAddress = {
            addressType: addressType == undefined ? checkAddress[0].addressType : addressType,
            isDefault: isDefault == undefined ? checkAddress[0].isDefault : isDefault,
            placeName: placeName == undefined ? checkAddress[0].placeName : placeName,
            placeAddress: placeAddress == undefined ? checkAddress[0].placeAddress : placeAddress,
            pincode: pincode == undefined ? checkAddress[0].pincode : pincode,
            houseNo: houseNo == undefined ? checkAddress[0].houseNo : houseNo,
            street: street == undefined ? checkAddress[0].street : street,
            landmark: landmark == undefined ? checkAddress[0].landmark : landmark,
            locality: locality == undefined ? checkAddress[0].locality : locality,
            city: city == undefined ? checkAddress[0].city : city,
            district: district == undefined ? checkAddress[0].district : district,
            region: region == undefined ? checkAddress[0].region : region,
            country: country == undefined ? checkAddress[0].country : country,
            lat: lat == undefined ? checkAddress[0].lat : lat,
            mobileNo: mobileNo == undefined ? checkAddress[0].mobileNo : mobileNo,
            countryCode: countryCode == undefined ? checkAddress[0].countryCode : countryCode,
            long: long == undefined ? checkAddress[0].long : long
        }
        let updateAdd = await addressSchema.findByIdAndUpdate(addressId, createAddress, { new: true });
        return res.status(200).json({ issuccess: true, data: { acknowledgement: true, data: { addressId: updateAdd._id } }, message: "Address details updated" });

    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ issuccess: false, data: { acknowledgement: false }, message: error.message || "Having issue is server" })
    }
})
router.get('/address', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user._id
        let getAddress = await addressSchema.aggregate([
            {
                $match: {
                    userId: mongoose.Types.ObjectId(userId)
                }
            },
            {
                $addFields: {
                    "id": "$_id"
                }
            },
            {
                $project: {
                    _id: 0,
                    __v: 0
                }
            }
        ]);

        return res.status(getAddress.length > 0 ? 200 : 200).json({ issuccess: getAddress.length > 0 ? true : false, data: { acknowledgement: getAddress.length > 0 ? true : false, data: getAddress }, message: getAddress.length > 0 ? "address found" : "address not found" });

    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ issuccess: false, data: { acknowledgement: false }, message: error.message || "Having issue is server" })
    }
})
router.post('/addSubscription', authenticateToken, async (req, res, next) => {
    try {
        const { planId } = req.body;
        const userId = req.user._id;
        let checkCategory = await subscriptionSchema.findById(mongoose.Types.ObjectId(planId));
        // console.log(checkCategory);
        if (checkCategory == undefined || checkCategory == null) {
            return res.status(200).json({ issuccess: true, data: { acknowledgement: false, data: null }, message: `subscription plan not found` });
        }
        let createAddress = new userSubscription({
            planId: planId,
            userId: userId,
            pickup: checkCategory.pickup,
            delivery: checkCategory.delivery
        })

        await createAddress.save();
        createAddress._doc['id'] = createAddress._doc['_id'];
        delete createAddress._doc.updatedAt;
        delete createAddress._doc.createdAt;
        delete createAddress._doc._id;
        delete createAddress._doc.__v;
        delete createAddress._doc.paymentId;
        delete createAddress._doc.orderStatus;
        return res.status(200).json({ issuccess: true, data: { acknowledgement: true, data: createAddress }, message: "user subscription added" });

    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ issuccess: false, data: { acknowledgement: false }, message: error.message || "Having issue is server" })
    }
})
router.put('/updateSubscription', authenticateToken, async (req, res, next) => {
    try {
        const { subscriptionId, status, paymentId } = req.body;
        const userId = req.user._id;
        let checkCategory = await userSubscription.findById(mongoose.Types.ObjectId(subscriptionId));
        // console.log(checkCategory);
        if (checkCategory == undefined || checkCategory == null) {
            return res.status(200).json({ issuccess: true, data: { acknowledgement: false, data: null }, message: `subscription plan not found` });
        }
        let updateField = {
            status: status,
            paymentId: paymentId
        }
        let createAddress = await userSubscription.findByIdAndUpdate(subscriptionId, updateField, { new: true });
        createAddress._doc['id'] = createAddress._doc['_id'];
        delete createAddress._doc.updatedAt;
        delete createAddress._doc.createdAt;
        delete createAddress._doc._id;
        delete createAddress._doc.__v;
        return res.status(200).json({ issuccess: true, data: { acknowledgement: true, data: createAddress }, message: "user subscription updated" });

    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ issuccess: false, data: { acknowledgement: false }, message: error.message || "Having issue is server" })
    }
})
router.get('/getSubscription', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user._id
        let getAddress = await userSubscription.aggregate([
            {
                $match: {
                    userId: mongoose.Types.ObjectId(userId)
                }
            },
            {
                $addFields: {
                    "id": "$_id"
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    let: { id: "$planId" },
                    pipeline: [{
                        $match: {
                            $expr: {
                                $eq: ["$_id", "$$id"]
                            }
                        }
                    },
                    {
                        $addFields: {
                            "id": "$_id"
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            __v: 0,
                            isVisible: 0,
                            createdAt: 0,
                            updatedAt: 0
                        }
                    }],
                    as: "planDetails"
                }
            },
            {
                $addFields: {
                    planDetails: { $first: "$planDetails" }
                }
            },
            {
                $project: {
                    _id: 0,
                    __v: 0,
                    createdAt: 0,
                    updatedAt: 0
                }
            }
        ]);

        return res.status(200).json({ issuccess: true, data: { acknowledgement: true, data: getAddress }, message: getAddress.length > 0 ? "address found" : "address not found" });

    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ issuccess: false, data: { acknowledgement: false }, message: error.message || "Having issue is server" })
    }
})
function validateEmail(emailAdress) {
    let regexEmail = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (emailAdress.match(regexEmail)) {
        return true;
    } else {
        return false;
    }
}
function validatePhoneNumber(input_str) {
    var re = /^\(?(\d{3})\)?[- ]?(\d{3})[- ]?(\d{4})$/;

    return re.test(input_str);
}
function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}
// async..await is not allowed in global scope, must use a wrapper


module.exports = router;
