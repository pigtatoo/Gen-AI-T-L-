const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.signup = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const { data: existingUsers, error: existingErr } = await supabase
      .from('Users')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (existingErr) {
      return res.status(500).json({ error: existingErr.message });
    }
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    const { data: inserted, error: insertErr } = await supabase
      .from('Users')
      .insert({ name, email, password: hashed, role: 'student', createdAt: now, updatedAt: now })
      .select('*')
      .limit(1);

    if (insertErr) {
      return res.status(500).json({ error: insertErr.message });
    }
    const user = inserted && inserted[0];

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: users, error: findErr } = await supabase
      .from('Users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (findErr) {
      return res.status(500).json({ error: findErr.message });
    }
    const user = users && users[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
