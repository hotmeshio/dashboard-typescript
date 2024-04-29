import { Router } from 'express';
import { Types } from '../../services/pluck/config';
import { GPT } from '../../services/ai/gpt'
import { User } from '../../services/pluck/user';
import { Bill } from '../../services/pluck/bill';

const ENTITIES = { user: User, bill: Bill };

const router = Router();

// Execute a method on a pluck instance
router.post('/:method', async (req, res) => {
  const params = req.params as Types.StringAnyType;
  const data = req.body?.data;

  if (params.method === 'ask') {
    const response = await GPT.ask(data.messages);
    return res.status(200).send(response);
  }

  //metadata holds 'entity' type and 'await' flag
  const md = req.body?.metadata;
  const bAwait = md?.await ?? true;
  const entityType = md?.entity ?? 'user'
  const entity = ENTITIES[entityType] ?? ENTITIES['user'];
  const pluckMethod = entity.pluck[params.method];
  if (!pluckMethod) {
    return res.status(404).send({ error: `Method [pluck.${params.method}] not found` });
  }
  try {
    const args: any | Array<any> = Array.isArray(data) ? data : [data];
    const pluckResponse = pluckMethod.apply(entity.pluck, args);
    if (!bAwait) {
      return res.status(202).send({ status: 'accepted', method: params.method });
    }
    res.status(200).send(await pluckResponse);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

export { router };
