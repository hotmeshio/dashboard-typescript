import Redis from 'ioredis';
import { Pluck, HotMesh, HotMeshTypes, Types } from '@hotmeshio/pluck';
import config from '../../config';

const pluck = new Pluck(
  Redis, 
  {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD,
    db: config.REDIS_DATABASE,
  });

export { Redis, pluck, Pluck, HotMesh, HotMeshTypes, Types }
