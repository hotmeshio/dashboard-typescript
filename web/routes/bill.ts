import { Router } from 'express';
import { Bill } from '../../services/pluck/bill';

const router = Router();

// Fetch all bills (pagination)
router.get('/', async (req, res) => {
  try {
    res.status(201).send(await Bill.find([], 0, 100));
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Fetch a bill
router.get('/:billId', async (req, res) => {
  try {
    const { billId } = req.params;
    res.status(200).send(await Bill.retrieve(billId));
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

export { router };
