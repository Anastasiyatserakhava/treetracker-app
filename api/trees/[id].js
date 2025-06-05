import { supabase, corsHeaders, getAuthenticatedUser } from '../../lib/supabase.js';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method !== 'DELETE') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Tree ID is required'
      });
    }

    // Get authenticated user (optional for now)
    let user = null;
    try {
      user = await getAuthenticatedUser(req);
    } catch (authError) {
      // For backward compatibility, allow deletion without authentication
    }

    // Get the tree first to check ownership
    const { data: tree, error: fetchError } = await supabase
      .from('trees')
      .select('planted_by_id, planted_by')
      .eq('id', id)
      .single();

    if (fetchError || !tree) {
      return res.status(404).json({
        success: false,
        error: 'Tree not found'
      });
    }

    // If user is authenticated, check if they own the tree
    if (user && tree.planted_by_id !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own trees'
      });
    }

    // Delete the tree
    const { error: deleteError } = await supabase
      .from('trees')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Delete tree error:', deleteError);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete tree'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Tree deleted successfully'
    });

  } catch (error) {
    console.error('Delete tree error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
