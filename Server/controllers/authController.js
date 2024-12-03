const User = require('../models/user')
const {hashPassword,comparePassword} = require('../helpers/auth')
const jwt = require('jsonwebtoken');


const test = (req,res) =>{
    res.json('test is working')
}


//register endpoint
const registerUser = async (req,res) =>{
    try {
        const {name,email,password,isDoctor} = req.body;
        // check if name entered
        if (typeof isDoctor !== 'boolean') {
            return res.status(400).json({
                error: 'isDoctor field is required and must be a boolean'
            });
        }
        if(!name) {
            return res.json({
                error: 'name is required'
            })
        }
        // check if password entered
        if(!password || password.length < 6) {
            return res.json({
                error: 'password is required, need 6 characters long'
            })
        }
        // check if email entered
        const exist = await User.findOne({email}) 
        if (exist) {
            return res.json({
                error: 'email is taken'
            })
        }

        const hashedPassword = await hashPassword(password)


        //Create user in database
        const user = await User.create({
            name,
            email,
            password:hashedPassword,
            isDoctor
        })
        return res.json(user)
    } catch (error) {
        console.log(error)
    }
}
//login endpoint
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.json({ error: 'No user found' });
        }
        
        const match = await comparePassword(password, user.password);
        
        if (match) {
            // Generate JWT
            const token = jwt.sign(
                { email: user.email, id: user._id, name: user.name },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }  // Optionally set an expiry for the token
            );

            // Send the cookie
            res.cookie('token', token, {
                httpOnly: true, // Ensures the cookie is not accessible via JavaScript
                secure: false, // Set to true if using HTTPS
                sameSite: 'Lax', // Prevent CSRF attacks
            }).json(user);
        } else {
            return res.json({ error: 'Incorrect password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

const getProfile = (req,res)=>{
    console.log("Cookies received:", req.cookies); // Debugging

      const {token} = req.cookies
      if(token){
        jwt.verify(token,process.env.JWT_SECRET,{},(err,user)=>{
            if(err) throw err;
            res.json(user)
        })
      }else{
        res.json(null)
      }
}
const updateUser = async (req,res)=>{
    try {
        const {name, password} =req.body;
        const {token} = req.cookies;
        
        if(token){
        jwt.verify(token,process.env.JWT_SECRET,async(err,decodedUser)=>{
            if(err){
                return res.json({error: 'Invalid or expired token'});
            }

            const user = await User.findById(decodedUser.id)
            if(!user){
                return res.json({error:'User not found'});
            }
            // Update user data
            if (name) {
                user.name = name;
            }

            if (password) {
                // Hash new password
                user.password = await hashPassword(password);
            }

            await user.save(); // Save the updated user

            return res.json(user);
        })
    } else{
        return res.json({error:'No token found, Login please.'})
    }
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Server error' });
    }
}

const logoutUser = (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: false, // Set to true in production with HTTPS
        sameSite: 'Lax',
    });
    return res.json({ message: 'Logged out successfully' });
};

module.exports ={
    test,
    registerUser,
    loginUser,
    getProfile,
    updateUser,
    logoutUser
}