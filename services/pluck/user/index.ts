import { HotMesh, Pluck, Types } from '@hotmeshio/pluck';
import * as Redis from 'redis';

import config from '../../../config';

/**
 * The 'User' entity. Shows how Redis-backed governance is able to
 * create durable, transactional workflows using a reentrant
 * process architecture. While the main function stays open and
 * is actively part of the operational data layer (ODL), hook functions
 * can be interleaved that transactionally update primary state.
 * 
 */
class User {
  //the entity type (i.e., 'user' table)
  entity = 'user';

  //user entity field names
  fields = ['$entity', 'id', 'first', 'last', 'email', 'active', 'cycle', 'plan'];

  //the RediSearch schema (used for search/indexing)
  search: Types.WorkflowSearchOptions = {
    schema: {
      id: { type: 'TAG', sortable: true },
      first: { type: 'TEXT', sortable: true },
      last: { type: 'TEXT', sortable: true },
      email: { type: 'TAG', sortable: true },
      active: { type: 'TAG', sortable: true },
      plan: { type: 'TAG', sortable: true },
      cycle: { type: 'TAG', sortable: true }
    },
    index: this.entity,
    prefix: [this.entity],
  };

  //initialize Redis, including RediSearch configuration
  pluck = new Pluck(
    Redis,
    { url: `redis://:${config.REDIS_PASSWORD}@${config.REDIS_HOST}:${config.REDIS_PORT}` },
    undefined,
    this.search,
  );

//******************* ON-CONTAINER-STARTUP COMMANDS ********************

  /**
   * Connect functions
   */
  async connect() {
    this.pluck.connect({
      entity: this.entity,
      target: this.workflow.create,
      options: { ttl: 'infinity' }
    });

    this.pluck.connect({
      entity: `${this.entity}.bill`,
      target: this.workflow.bill
    });
  } 

  /**
   * Create the search index
   */
  async index() {
    await this.pluck.createSearchIndex(
      this.entity,
      undefined,
      this.search
    );
  }

//******************* ON-CONTAINER-SHUTDOWN COMMANDS ********************

  async shutdown() {
    await Pluck.shutdown();
  }

//********** STANDARD USER METHODS (CREATE, FIND, ETC) ******************

  /**
   * Create User
   */
  async create(body: Record<string, any>) {
    const { id, email, first, last, plan, cycle } = body;
    //call `pluck.exec` to add the user to the operational data layer (ODL)
    await this.pluck.exec<string>({
      entity: this.entity,
      args: [id],
      options: { id,
        search: {
          data: {
            '$entity': this.entity,
            active: 'true',
            id,
            email,
            first,
            last,
            plan: plan ?? 'starter',
            cycle: cycle ?? 'monthly',
            discount : '0',
          }
        }
      }
    });

    //echo the job state (the created user)
    return await this.retrieve(id);
  }

  /**
   * Retrieve User
   * @param id
   * @returns
   * @throws
   */
  async retrieve(id: string) {
    const user = await this.pluck.get( this.entity, id, { fields: this.fields });
    if (!user?.id) throw new Error('User not found');
    return user;
  }

  /**
   * Update User
   */
  async update(id: string, body: Record<string, any>) {
    await this.retrieve(id);
    await this.pluck.set(this.entity, id, { search: { data: body }});
    return await this.retrieve(id);
  }

  /**
   * Save the user's chosen plan; trigger the `user.bill` hook (a 
   * recurring process that sends a bill every month or year, depending)
   */
  async plan(id: string, data: { plan: string, cycle: string }): Promise<Record<string, any>> {
    //exit early if user not found or if plan is already set
    await this.retrieve(id);
    const state = await this.pluck.get(this.entity, id, { fields: ['plan'] });
    if (state?.plan === data.plan) return;

    //run the 'user.bill' transactional hook
    await this.pluck.hook({
      entity: this.entity,
      id,
      hookEntity: `${this.entity}.bill`,
      hookArgs: [HotMesh.guid(), data.plan, data.cycle],
    });

    return data;
  }

  /**
   * Delete User
   */
  async delete(id: string) {
    //user will be fully removed within 2 minutes
    await this.retrieve(id);
    await this.pluck.flush(this.entity, id);
    return true;
  }

  /**
   * Find users WHERE
   */
  async find(query: { field: string, is: '=' | '[]' | '>=' | '<=', value: string}[] = [], start = 0, size = 100): Promise<{ count: number; query: string; data: Types.StringStringType[]; }> {
    //NOTE: email is a TAG type. When searching, escape as follows: a\.b\@c\.com
    const response = await this.pluck.findWhere(
      this.entity, 
      { query,
        return: this.fields,
        limit: { start, size}
      },
    ) as { count: number; query: string; data: Types.StringStringType[]; };
    return response;
  }

  /**
   * Count users WHERE
   */
  async count(query: { field: string, is: '=' | '[]' | '>=' | '<=', value: string}[]): Promise<number> {
    return await this.pluck.findWhere(this.entity, { query, count: true }) as number;
  }

//*************** WORKFLOW-ORIENTED METHODS (DATA IN MOTION) *************

  workflow = {

    async create(id: string): Promise<string> {
      return id;
    },

    async bill(planId: string, plan: string, cycle: string) {
      //persist the billing plan details
      const userId = Pluck.workflow.getContext().workflowId;
      const search = await Pluck.workflow.search();
      await search.set('userId', userId, 'planId', planId, 'plan', plan, 'cycle', cycle);
      let currentPlanId = planId;
  
      //send a recurring bill
      do {
        const timestamp = Date.now();
        await Pluck.workflow.executeChild({
          entity: 'bill',
          args: [{ userId, planId, plan, cycle, timestamp }]
        });
  
        //sleep for a month; confirm the plan upon awakening
        const duration = cycle === 'monthly' ? '1 minute' : '120 seconds';
        await Pluck.workflow.sleepFor(duration);
        currentPlanId = await search.get('planId');
      } while (currentPlanId === planId);
    }
  }
}

const user = new User();

export { user as User, Pluck };
