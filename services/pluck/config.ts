import * as Redis from 'redis';
import { Pluck, HotMesh, HotMeshTypes, Types } from '@hotmeshio/pluck';
import config from '../../config';

const url = `redis://:${config.REDIS_PASSWORD}@${config.REDIS_HOST}:${config.REDIS_PORT}`;
const pluck = new Pluck(Redis, { url });

export { Redis, pluck, Pluck, HotMesh, HotMeshTypes, Types }
