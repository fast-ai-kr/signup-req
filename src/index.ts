/**
 * 메인 CLI 엔트리 파일
 */
import Octokit from '@octokit/rest'
import { GitHubService } from './github'
import { MembersService } from './members-service'
import path from 'path'

const org = 'fast-ai-kr'
// TRUE => API로 멤버 추가 삭제 실행함
const shouldSubmit = !!process.env.SHOULD_SUBMIT || false

if (shouldSubmit) {
  console.log('Running in the production mode')
}

// Octokit 클라이언트 만듬
function buildOctokit(): Octokit {
  const auth = process.env.GITHUB_AUTH
  if (!auth) {
    throw new Error('GITHUB_AUTH is required')
  }
  return new Octokit({
    auth,
  })
}

async function main(shouldSubmit: boolean = false) {
  const service = new GitHubService(buildOctokit(), { org })
  const membersService = new MembersService(path.resolve('members.yaml'))

  const currentMembers = (await service.getMaintainerMembers()).map(
    m => m.login,
  )

  const pendingMembers = (await service.getPendingInvitations()).map(m => {
    return m.login
  })

  const newMembersToAdd = membersService.getMembersToAdd(
    currentMembers.concat(pendingMembers),
  )
  const newMembersDelete = membersService.getMembersToDelete(currentMembers)

  const currentAdmins = (await service.getAdminMembers()).map(m => m.login)
  const newAdminsToAdd = membersService.getMembersToAdd(
    currentAdmins.concat(pendingMembers),
    true,
  )
  const newAdminsToDelete = membersService.getMembersToDelete(
    currentAdmins,
    true,
  )

  console.log({
    pendingMembers,
    newMembersToAdd,
    newMembersDelete,
    newAdminsToAdd,
    newAdminsToDelete,
  })

  if (shouldSubmit) {
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
