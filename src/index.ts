/**
 * 메인 CLI 엔트리 파일
 */
import { Octokit } from '@octokit/rest'
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

  // 추가 해야 되는 새로운 members
  // = members.yaml 에 있는 members
  // - 현재 GitHub Org 에 등록 된 members 제외
  // - Pending Invitation 제외
  const newMembersToAdd = membersService.getMembersToAdd(
    currentMembers.concat(pendingMembers),
  )

  // 제거 되어야 하는 members
  // = 현재 GitHub Org 에 등록 된 members
  // - members.yaml 에 있는 members 제외
  const newMembersDelete = membersService.getMembersToDelete(currentMembers)

  // 동일 로직 but for admins
  const currentAdmins = (await service.getAdminMembers()).map(m => m.login)
  const newAdminsToAdd = membersService.getMembersToAdd(
    currentAdmins.concat(pendingMembers),
    true,
  )

  // TODO: 만약 user가 toAdd에 존재한다면 toDelete에서 제외되어야 한다.
  //
  // For example, if an user switches from members to admin
  //
  // Current behavior:
  // The user will be removed from members,
  // and the user will be added to the admin. So the result is undefined.
  //
  // Expected:
  // User doesn't get removed from members but just update to admin.
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

main(shouldSubmit)
  .then(console.log)
  .catch(err => {
    console.warn('failed during Promise.all. See the error => ', err)
  })
