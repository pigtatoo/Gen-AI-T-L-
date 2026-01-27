const supabase = require('../config/supabase');

exports.getUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Users')
      .select('id, name, email, role')
      .order('id', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ users: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const validRoles = ['student', 'teacher', 'staff'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const { data, error } = await supabase
      .from('Users')
      .update({ role })
      .eq('id', id)
      .select('id, name, email, role')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
