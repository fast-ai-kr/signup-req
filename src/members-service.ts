import fs from 'fs'
import yaml from 'js-yaml'

export interface Config {
  members: string[]
  admin: string[]
}

/**
 * members.yaml 을 관리하기 위한 서비스
 */
export class MembersService {
  data: {
    admin: Set<string>
    members: Set<string>
  }

  constructor(private filename: string) {
    this.data = {
      admin: new Set(),
      members: new Set(),
    }
    const membersDataFile = yaml.safeLoad(
      fs.readFileSync(filename, 'utf8'),
    ) as Config
    if (!membersDataFile) {
      throw new Error('unable to find a filename: ' + filename)
    }
    this.data.members = new Set(membersDataFile.members)
    this.data.admin = new Set(membersDataFile.admin)
  }

  addMember(member: string) {
    this.data.members.add(member)
  }

  hasMember(member: string): boolean {
    return this.data.members.has(member)
  }

  addAdmin(member: string) {
    this.data.admin.add(member)
  }

  hasAdmin(member: string): boolean {
    return this.data.admin.has(member)
  }

  getMembersToAdd(currentMembers: string[], admin: boolean = false): string[] {
    const currentMembersSet = new Set(currentMembers)
    const data = admin ? this.data.admin : this.data.members
    return Array.from(new Set([...data].filter(m => !currentMembersSet.has(m))))
  }

  getMembersToDelete(
    currentMembers: string[],
    admin: boolean = false,
  ): string[] {
    const s = admin ? this.data.admin : this.data.members
    return currentMembers.filter(m => !s.has(m))
  }

  write() {
    fs.writeFileSync(
      this.filename,
      yaml.safeDump(this.getDump(), { sortKeys: true }),
    )
  }

  private getDump() {
    return {
      admin: this.cleanArray(this.data.admin),
      members: this.cleanArray(this.data.members),
    }
  }

  private cleanArray(xs: Set<string>) {
    return [...Array.from(xs)].sort()
  }
}
