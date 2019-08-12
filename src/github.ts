import Octokit from '@octokit/rest'

export interface GitHubServiceConfig {
  org: string
}

export class GitHubService {
  private cache = new Map()
  constructor(private octokit: Octokit, private config: GitHubServiceConfig) {}

  async getTeamByName(name: string): Promise<Octokit.TeamsGetByNameResponse> {
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

  async getTeams(): Promise<Octokit.TeamsListResponse> {
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

  async inviteToMaintainerTeam(username: string) {
    const maintainerTeam = await this.getTeamByName('maintainer')
    return this.octokit.teams.addOrUpdateMembership({
      team_id: maintainerTeam.id,
      username,
    })
  }

  async inviteToAdminTeam(username: string) {
    return this.octokit.orgs.addOrUpdateMembership({
      org: this.config.org,
      username,
      role: 'admin',
    })
  }

  async removeMember(username: string) {
    return this.octokit.orgs.removeMembership({
      org: this.config.org,
      username,
    })
  }

  async getAdminMembers(): Promise<Octokit.OrgsListMembersResponse> {
    const getAdminMembersCacheId = '__GET_ADMIN_MEMEBERS_CACHE_ID__'
    return this.getMembersInOrg(getAdminMembersCacheId, true)
  }

  async getMaintainerMembers(): Promise<Octokit.OrgsListMembersResponse> {
    const getMaintainerMembersCacheId = '__GET_MAINTAINER_MEMBERS_CACHE_ID'
    return this.getMembersInOrg(getMaintainerMembersCacheId, false)
  }

  private async getMembersInOrg(cacheId: string, admin: boolean) {
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
