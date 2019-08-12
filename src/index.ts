import Octokit from '@octokit/rest'
import { GitHubService } from './github'
import { MembersService } from './members-service'
import path from 'path'

const org = 'fast-ai-kr'
const shouldSubmit = !!process.env.SHOULD_SUBMIT || false

function buildOctokit(): Octokit {
  const auth = process.env.GITHUB_AUTH
  if (!auth) {
    throw new Error('GITHUB_AUTH is required')
  }
  return new Octokit({
    auth,
  })
}

async function main(send = false) {
  const service = new GitHubService(buildOctokit(), { org })
  const membersService = new MembersService(path.resolve('members.yaml'))

  const currentMembers = (await service.getMaintainerMembers()).map(
    m => m.login,
  )

  const newMembersToAdd = membersService.getMembersToAdd(currentMembers)
  const newMembersDelete = membersService.getMembersToDelete(currentMembers)

  const currentAdmins = (await service.getAdminMembers()).map(m => m.login)
  const newAdminsToAdd = membersService.getMembersToAdd(currentAdmins, true)
  const newAdminsToDelete = membersService.getMembersToDelete(
    currentAdmins,
    true,
  )

  console.log({
    newMembersToAdd,
    newMembersDelete,
    newAdminsToAdd,
    newAdminsToDelete,
  })

  if (send) {
    return Promise.all(
      newMembersToAdd
        .map(m => service.inviteToMaintainerTeam(m))
        .concat(newMembersDelete.map(m => service.removeMember(m)))
        .concat(newAdminsToAdd.map(m => service.inviteToAdminTeam(m)))
        .concat(newAdminsToDelete.map(m => service.removeMember(m))),
    )
  }

  return Promise.resolve(true)
}

main(shouldSubmit).then(console.log)
