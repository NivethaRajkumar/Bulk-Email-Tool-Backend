import User from '../Models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const signup = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        let user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        user = new User({
            name,
            email,
            password: hashedPassword,
        });

        await user.save();
        res.status(201).json({ msg: 'User registered successfully' });
    } catch (err) {
        console.error("Error in signup:", err.message);
        res.status(500).send('Server error');
    }
};

export const signin = async(req,res)=>{
    const { email, password }=req.body;

    try {
        //Check User
        const user=await User.findOne({email});
        if(!user){
            return res.status(404).json({message:'User not found'})
        }

        //Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch){
            return res.status(400).json({Message:"Invalid credentials"})
        }

        //JWT
        const token=jwt.sign({id:user._id},process.env.JWT_SECRET, {ExpiresIn:'1hr'})
        res.status(200).json({token, userId:user._id,userName:user.name})
        
    } catch (error) {
        res.status(500).json({message:"Server error"})
    }
}
