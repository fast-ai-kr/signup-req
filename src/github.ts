import { Octokit, RestEndpointMethodTypes } from '@octokit/rest'

export interface GitHubServiceConfig {
  // org name: fast-ai-kr
  org: string
}

export class GitHubService {
  private cache = new Map()
  constructor(private octokit: Octokit, private config: GitHubServiceConfig) {}

  /**
   * @org/admin 혹은 @org/maintainer team 오브젝트 반환
   */
  async getTeamByName(
    name: string,
  ): Promise<
    RestEndpointMethodTypes['teams']['getByName']['response']['data']
  > {
    if (this.cache.has(name)) {
      return Promise.resolve(this.cache.get(name))
    }

    return this.octokit.teams
      .getByName({ org: this.config.org, team_slug: name })
      .then(res => {
        this.cache.set(name, res.data)
        return res.data
      })
  }

  async getTeams(): Promise<
    RestEndpointMethodTypes['teams']['list']['response']['data']
  > {
    const getTeamsCacheId = '__TEAMS__'

    if (this.cache.has(getTeamsCacheId))
      return Promise.resolve(this.cache.get(getTeamsCacheId))

    return this.octokit.teams
      .list({ org: this.config.org })
      .then(res => res.data)
      .then(teams => {
        teams.forEach(team => {
          this.cache.set(team.name, team)
        })

        this.cache.set(getTeamsCacheId, teams)

        return teams
      })
  }

  /**
   * @org/maintainer Team으로 초대함. Organization member가 아닐 경우 자동으로 org 초대함
   */
  async inviteToMaintainerTeam(username: string) {
    const maintainerTeam = await this.getTeamByName('maintainer')
    return this.octokit.teams.addOrUpdateMembershipForUserInOrg({
      team_id: maintainerTeam.id,
      username,
      org: maintainerTeam.organization.name,
      team_slug: maintainerTeam.slug,
    })
  }

  /**
   * Organization Owner로 초대함
   */
  async inviteToAdminTeam(username: string) {
    return this.octokit.orgs.setMembershipForUser({
      org: this.config.org,
      username,
      role: 'admin',
    })
  }

  /**
   * Org에서 member 추방
   */
  async removeMember(username: string) {
    return this.octokit.orgs.removeMembershipForUser({
      org: this.config.org,
      username,
    })
  }

  /**
   * Owners 반환
   */
  async getAdminMembers(): Promise<
    RestEndpointMethodTypes['orgs']['listMembers']['response']['data']
  > {
    const getAdminMembersCacheId = '__GET_ADMIN_MEMEBERS_CACHE_ID__'
    return this.getMembersInOrg(getAdminMembersCacheId, true)
  }

  /**
   * 일반 Maintainers 반환
   */
  async getMaintainerMembers(): Promise<
    RestEndpointMethodTypes['orgs']['listMembers']['response']['data']
  > {
    const getMaintainerMembersCacheId = '__GET_MAINTAINER_MEMBERS_CACHE_ID'
    return this.getMembersInOrg(getMaintainerMembersCacheId, false)
  }

  async getPendingInvitations(): Promise<
    RestEndpointMethodTypes['orgs']['listPendingInvitations']['response']['data']
  > {
    return this.octokit.orgs
      .listPendingInvitations({ org: this.config.org })
      .then(res => res.data)
  }

  private async getMembersInOrg(
    cacheId: string,
    admin: boolean,
  ): Promise<
    RestEndpointMethodTypes['orgs']['listMembers']['response']['data']
  > {
    const ret = this.cache.get(cacheId)
    if (ret) return Promise.resolve(ret)
    return this.octokit.orgs
      .listMembers({
        org: this.config.org,
        role: admin ? 'admin' : 'member',
      })
      .then(res => {
        this.cache.set(cacheId, res.data)
        return res.data
      })
  }
}
