const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client (you'll need to set up a Supabase project)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method not allowed' };
  }

  try {
    // Generate room code
    const roomCode = Math.random().toString(36).substr(2, 6).toUpperCase();

    // Create room in database
    const { data, error } = await supabase
      .from('rooms')
      .insert([{ code: roomCode, created_at: new Date() }]);

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        type: 'roomCreated',
        code: roomCode
      })
    };
  } catch (error) {
    console.error('Error creating room:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to create room' })
    };
  }
};