import { supabase, corsHeaders, getAuthenticatedUser } from '../lib/supabase.js';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'GET') {
    try {
      const { data: trees, error } = await supabase
        .from('trees')
        .select(`
          *,
          users!planted_by_id (
            name,
            graduation_year
          )
        `)
        .order('date', { ascending: false });

      if (error) {
        throw error;
      }

      return res.status(200).json(
        trees.map(tree => ({
          id: tree.id,
          date: tree.date,
          dateTime: tree.created_at,
          location: tree.location,
          gpsCoordinates: tree.gps_coordinates,
          lat: tree.lat,
          lng: tree.lng,
          typeOfActivity: tree.type_of_activity,
          species: tree.species,
          remarks: tree.remarks,
          state: tree.state,
          plantedBy: tree.planted_by,
          plantedById: tree.planted_by_id,
          graduation: tree.graduation_year,
          photo: tree.photo,
          ageInDays: tree.age_days,
          ageInYears: tree.age_years
        }))
      );

    } catch (error) {
      console.error('Get trees error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch trees'
      });
    }
  }

  if (req.method === 'POST') {
    try {
      // Get authenticated user (optional for now, can be enforced later)
      let user = null;
      try {
        user = await getAuthenticatedUser(req);
      } catch (authError) {
        // For backward compatibility, allow posting without authentication
        // but use the provided plantedBy and plantedById
      }

      const {
        date,
        dateTime,
        location,
        gpsCoordinates,
        lat,
        lng,
        typeOfActivity,
        species,
        remarks,
        state,
        plantedBy,
        plantedById,
        graduation,
        photo
      } = req.body;

      // Validate required fields
      if (!date || !location || !typeOfActivity || !species || !state || !plantedBy) {
        return res.status(400).json({
          success: false,
          error: 'Required fields: date, location, typeOfActivity, species, state, plantedBy'
        });
      }

      // Insert tree record
      const { data: tree, error } = await supabase
        .from('trees')
        .insert({
          date: date,
          location: location.trim(),
          gps_coordinates: gpsCoordinates,
          lat: lat,
          lng: lng,
          type_of_activity: typeOfActivity,
          species: species.trim(),
          remarks: remarks?.trim() || null,
          state: state.trim(),
          planted_by: plantedBy.trim(),
          planted_by_id: plantedById || (user ? user.id : null),
          graduation_year: graduation || (user ? user.graduation_year : null),
          photo: photo || null
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to save tree record'
        });
      }

      // Check for achievements (simple example)
      const achievements = [];
      if (user) {
        const { data: userTrees } = await supabase
          .from('trees')
          .select('id')
          .eq('planted_by_id', user.id);

        const treeCount = userTrees?.length || 0;

        // First tree achievement
        if (treeCount === 1) {
          const { error: achievementError } = await supabase
            .from('achievements')
            .insert({
              user_id: user.id,
              name: 'First Tree',
              description: 'Planted your first tree!',
              icon: '🌱'
            });

          if (!achievementError) {
            achievements.push({
              name: 'First Tree',
              description: 'Planted your first tree!',
              icon: '🌱'
            });
          }
        }

        // Milestone achievements
        if ([10, 25, 50, 100].includes(treeCount)) {
          const { error: achievementError } = await supabase
            .from('achievements')
            .insert({
              user_id: user.id,
              name: `${treeCount} Trees`,
              description: `Planted ${treeCount} trees!`,
              icon: treeCount >= 100 ? '🏆' : treeCount >= 50 ? '🌳' : '🌿'
            });

          if (!achievementError) {
            achievements.push({
              name: `${treeCount} Trees`,
              description: `Planted ${treeCount} trees!`,
              icon: treeCount >= 100 ? '🏆' : treeCount >= 50 ? '🌳' : '🌿'
            });
          }
        }
      }

      return res.status(201).json({
        success: true,
        tree: {
          id: tree.id,
          date: tree.date,
          location: tree.location,
          species: tree.species,
          plantedBy: tree.planted_by
        },
        newAchievements: achievements
      });

    } catch (error) {
      console.error('Add tree error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}
