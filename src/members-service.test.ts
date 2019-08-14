import { MembersService } from './members-service'

describe('MembersService', () => {
  let s: MembersService

  beforeEach(() => {
    s = new MembersService('mocks/members.yaml')
  })

  test('load file', () => {
    expect(s.hasMember('B')).toBeTruthy()
    expect(s.hasAdmin('A')).toBeTruthy()
  })

  test('getMembersToAdd', () => {
    // since current members are empty
    // B should be added as a new member
    const currentMembers: string[] = []
    expect(s.getMembersToAdd(currentMembers)).toStrictEqual(['B'])

    currentMembers.push('B')
    expect(s.getMembersToAdd(currentMembers)).toStrictEqual([])
  })

  test('getMembersToDelete', () => {
    // C does not exist in the file;
    // so C must be removed
    const currentMembers = ['B', 'C']
    expect(s.getMembersToDelete(currentMembers)).toStrictEqual(['C'])
  })
})
