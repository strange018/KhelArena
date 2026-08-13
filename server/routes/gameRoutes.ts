import { Router, Response } from 'express';
import { queryAll, queryOne, execute, transaction } from '../db/index.js';
import { authenticateToken, AuthenticatedRequest, logAudit } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const createGameSchema = z.object({
  venue_id: z.string(),
  court_id: z.string(),
  sport_id: z.string(),
  date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  title: z.string().min(3),
  description: z.string().optional(),
  price_per_player: z.number().positive(),
  max_players: z.number().int().min(2),
  skill_level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Open']).default('Intermediate')
});

// Create Public Game
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = createGameSchema.parse(req.body);
    const hostId = req.user!.id;

    const gameId = 'game_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const shareCode = 'JOIN-' + data.title.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6) + '-' + Math.floor(100 + Math.random() * 900);

    await transaction(async () => {
      await execute(`
        INSERT INTO games (
          id, share_code, host_id, venue_id, court_id, sport_id, date, start_time, end_time,
          price_per_player, max_players, current_players, skill_level, title, description, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 'OPEN')
      `, [
        gameId, shareCode, hostId, data.venue_id, data.court_id, data.sport_id, data.date, data.start_time, data.end_time,
        data.price_per_player, data.max_players, data.skill_level, data.title, data.description || '',
      ]);

      // Add Host as first participant
      await execute(`
        INSERT INTO game_participants (id, game_id, user_id, status)
        VALUES (?, ?, ?, 'JOINED')
      `, ['gp_' + Date.now(), gameId, hostId]);
    });

    await logAudit(hostId, req.user!.role, 'GAME_CREATE', 'GAME', gameId, { shareCode }, req.ip);

    res.json({
      game_id: gameId,
      share_code: shareCode,
      message: 'Game created! Share the link with friends to let them join.'
    });
  } catch (err: any) {
    res.status(400).json({ error: 'CREATE_GAME_FAILED', message: err.message });
  }
});

// List Public Open Games
router.get('/', async (req, res: Response) => {
  const { sport, skill, city = 'city_patna' } = req.query;

  let query = `
    SELECT g.*, 
      v.name as venue_name, v.address as venue_address, a.name as area_name,
      c.name as court_name, s.name as sport_name, s.icon as sport_icon,
      u.name as host_name, u.reliability_score as host_reliability
    FROM games g
    JOIN venues v ON g.venue_id = v.id
    JOIN areas a ON v.area_id = a.id
    JOIN courts c ON g.court_id = c.id
    JOIN sports s ON g.sport_id = s.id
    JOIN users u ON g.host_id = u.id
    WHERE g.status = 'OPEN' AND v.city_id = ?
  `;

  const params: any[] = [city];

  if (sport) {
    query += ` AND (g.sport_id = ? OR s.slug = ?)`;
    params.push(sport, sport);
  }

  if (skill) {
    query += ` AND g.skill_level = ?`;
    params.push(skill);
  }

  query += ` ORDER BY g.date ASC, g.start_time ASC`;

  const games = await queryAll(query, params);

  // Attach participant list
  const enriched = await Promise.all(
    games.map(async g => {
      const participants = await queryAll(`
        SELECT gp.joined_at, u.id as user_id, u.name, u.reliability_score
        FROM game_participants gp
        JOIN users u ON gp.user_id = u.id
        WHERE gp.game_id = ? AND gp.status = 'JOINED'
      `, [g.id]);

      return {
        ...g,
        participants
      };
    })
  );

  res.json(enriched);
});

// Get Game Details by Share Code (Public Link for WhatsApp sharing)
router.get('/by-share-code/:shareCode', async (req, res: Response): Promise<void> => {
  const { shareCode } = req.params;

  const game = await queryOne(`
    SELECT g.*, 
      v.name as venue_name, v.address as venue_address, a.name as area_name,
      c.name as court_name, s.name as sport_name, s.icon as sport_icon,
      u.name as host_name, u.phone as host_phone, u.reliability_score as host_reliability
    FROM games g
    JOIN venues v ON g.venue_id = v.id
    JOIN areas a ON v.area_id = a.id
    JOIN courts c ON g.court_id = c.id
    JOIN sports s ON g.sport_id = s.id
    JOIN users u ON g.host_id = u.id
    WHERE g.share_code = ? OR g.id = ?
  `, [shareCode, shareCode]);

  if (!game) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Game not found' });
    return;
  }

  const participants = await queryAll(`
    SELECT gp.joined_at, u.id as user_id, u.name, u.reliability_score
    FROM game_participants gp
    JOIN users u ON gp.user_id = u.id
    WHERE gp.game_id = ? AND gp.status = 'JOINED'
  `, [game.id]);

  res.json({
    ...game,
    participants
  });
});

// Join Game
router.post('/:id/join', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const gameId = req.params.id;
  const userId = req.user!.id;

  try {
    await transaction(async () => {
      const game = await queryOne('SELECT * FROM games WHERE id = ?', [gameId]);
      if (!game) throw new Error('Game not found');

      if (game.status !== 'OPEN') {
        throw new Error('This game is no longer open for new players.');
      }

      if (game.current_players >= game.max_players) {
        throw new Error('Game is full!');
      }

      const existingParticipant = await queryOne(
        'SELECT id FROM game_participants WHERE game_id = ? AND user_id = ? AND status = \'JOINED\'',
        [gameId, userId]
      );

      if (existingParticipant) {
        throw new Error('You have already joined this game!');
      }

      // Add Participant
      await execute(`
        INSERT INTO game_participants (id, game_id, user_id, status)
        VALUES (?, ?, ?, 'JOINED')
      `, ['gp_' + Date.now(), gameId, userId]);

      const newCount = game.current_players + 1;
      const newStatus = newCount >= game.max_players ? 'FULL' : 'OPEN';

      await execute('UPDATE games SET current_players = ?, status = ? WHERE id = ?', [newCount, newStatus, gameId]);

      // Create notification for host
      await execute(`
        INSERT INTO notifications (id, user_id, title, message, type)
        VALUES (?, ?, 'New Player Joined!', '${req.user!.name} joined your ${game.title} game!', 'COMMUNITY')
      `, ['notif_' + Date.now(), game.host_id]);
    });

    await logAudit(userId, req.user!.role, 'GAME_JOIN', 'GAME', gameId, {}, req.ip);

    res.json({ success: true, message: 'You have joined the game successfully!' });
  } catch (err: any) {
    res.status(400).json({ error: 'JOIN_FAILED', message: err.message });
  }
});

export default router;
