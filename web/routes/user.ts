import { Router } from 'express';
import { CustomRequest } from '../../types/http';
import { Socket } from '../utils/socket';
import { User } from '../../services/pluck/user';

const router = Router();

// Add a new user
router.post('/', async (req, res) => {
  try {
    res.json(await User.create(req.body as Body));
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Fetch all users (pagination)
router.get('/', async (req, res) => {
  try {
    res.status(201).send(await User.find([], 0, 100));
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Fetch a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    res.status(200).send(await User.retrieve(userId));
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

//sets the user's plan; establishes transactional recurring billing
router.patch('/:userId/plans', async (req, res) => {
  try {
    const { userId } = req.params;
    res.status(200).send(await User.plan(userId, req.body));
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Update a user
router.patch('/:userId', async (req: CustomRequest, res) => {
  const { userId } = req.params;
  const updates = { ...req.body };
  let updatedUser: Record<string, any>;
  try {
    updatedUser = await User.update(userId, req.body);
  } catch (err) {
    return res.status(500).send({ error: err.message });
  }

  Socket.broadcast('mesh.planes.control', {
    data: updatedUser,
    metadata: {
      timestamp: Date.now(),
      statusCode: 200,
      status: 'success'
    }
  });

  res.status(200).send({ id: userId, ...updates });
});


// Delete a user
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await User.delete(userId);
    res.json({ status: 'success' });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

export { router };
