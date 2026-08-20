import type { ActivityComponentType } from '@stackflow/react'
import { useActivity } from '@stackflow/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  ChipRef,
  PersonResponse,
  RelationGraphRequest,
} from '@/apis/generated/mongle-api.schemas'
import { relationGraphMutation } from '@/apis/mutations'
import { personQuery, relationGraphQuery } from '@/apis/queries'
import { RelationGraphCanvas } from '@/components/home/relation-graph-canvas'
import type {
  GraphLink,
  GraphNode,
} from '@/components/home/relation-graph-canvas'
import { RelationLinkSheet } from '@/components/home/relation-link-sheet'
import type { EditingLink } from '@/components/home/relation-link-sheet'
import { BackButton } from '@/components/layout/back-button'
import { PersonPickRow } from '@/components/person/person-pick-row'
import { Button } from '@/components/ui/button'
import { ConfirmPopup } from '@/components/ui/confirm-popup'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { ListGroup } from '@/components/ui/list-group'
import { NextBar } from '@/components/ui/next-bar'
import { PageTitle } from '@/components/ui/page-title'
import { TagChip } from '@/components/ui/tag-chip'
import { StatusMessage } from '@/components/ui/status-message'
import { affiliationLabel } from '@/lib/affiliation'
import { featureEvents, trackFeature } from '@/lib/analytics'
import { formatPersonName } from '@/lib/format'
import { INTIMACY_DEFAULT } from '@/lib/intimacy-scale'
import {
  freePosition,
  groupSize,
  memberPosition,
  nextGroupOrigin,
} from '@/lib/relation-graph-map'
import type { MapGroup } from '@/lib/relation-graph-map'
import { normalizeChipColor } from '@/lib/relation-tag-colors'
import { ActivityShell } from '@/stackflow/components/activity-shell'
import { useAppFlow } from '@/stackflow/use-app-flow'

/**
 * 관계에 방향이 없다 — 'A가 B를 안다'는 'B가 A를 안다'와 같은 선 하나다. 그래서 한 쌍을
 * 언제나 **작은 id 먼저**로 든다(서버도 같은 정규화를 한다). 화면과 서버가 같은 모양이어야
 * 저장하고 돌아왔을 때 같은 선인지 매번 다시 따지지 않는다.
 */
const pairKey = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`

/** 이미 있는 선은 건드리지 않고 없는 쌍만 더한다 — 사용자가 적어 둔 친밀도·메모를 덮으면 안 된다. */
function addPairs(links: GraphLink[], pairs: [number, number][]): GraphLink[] {
  const known = new Set(links.map((link) => pairKey(link.from, link.to)))
  const added: GraphLink[] = []
  pairs.forEach(([a, b]) => {
    if (a === b) return
    const key = pairKey(a, b)
    if (known.has(key)) return
    known.add(key)
    // 갓 이은 선은 가운데 값에서 시작한다. 아직 아무 말도 안 했으니 메모는 비운다.
    added.push({
      from: Math.min(a, b),
      to: Math.max(a, b),
      intimacy: INTIMACY_DEFAULT,
      note: null,
    })
  })
  return added.length > 0 ? [...links, ...added] : links
}

const toRequest = (
  groups: MapGroup[],
  nodes: GraphNode[],
  links: GraphLink[],
): RelationGraphRequest => ({
  groups,
  nodes: nodes.map((node) => ({
    personId: node.id,
    x: node.x,
    y: node.y,
    groupKey: node.groupKey,
  })),
  links: links.map((link) => ({
    fromPersonId: link.from,
    toPersonId: link.to,
    intimacy: link.intimacy,
    note: link.note,
  })),
})

/**
 * 인물관계도. '나와 그 사람'이 아니라 **그 사람들끼리**의 관계를 보는 화면이다.
 *
 * 저장은 **사용자가 누를 때만** 한다. 자동 저장을 두지 않는 건, 캔버스에서는 손이 지나가는
 * 모든 중간 상태(잘못 끈 선, 옮기다 만 자리)까지 저장될 수 있고 그걸 되돌릴 방법이 없기
 * 때문이다. 언제 남길지는 그린 사람이 정한다.
 * 대신 아직 저장 안 된 변경이 있으면 버튼이 그렇다고 말하고, 그대로 나가려 하면 한 번 묻는다.
 * 보내는 단위는 언제나 화면 전체다(전체 교체 규약, mustpass 07-relation-graph).
 */
export const RelationGraphActivity: ActivityComponentType<
  'RelationGraph'
> = () => {
  const { pop, replace } = useAppFlow()
  // 직접 주소로 들어오면(새로고침·딥링크) 내 아래에 쌓인 화면이 없어 pop 할 자리가 없다.
  const { isRoot } = useActivity()
  const queryClient = useQueryClient()
  const personsQuery = useQuery(personQuery.all())
  const graphQuery = useQuery(relationGraphQuery.get())
  const persons = personsQuery.data ?? []

  const [groups, setGroups] = useState<MapGroup[]>([])
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [links, setLinks] = useState<GraphLink[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  // 시트를 여는 순간 지금 올라간 사람으로 체크를 맞춰 두고, 담기 전까지는 지도를 건드리지
  // 않는다 — 한 명 고를 때마다 뒤 지도가 움직이면 고르는 도중에 자리가 다 바뀐다.
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [keyword, setKeyword] = useState('')
  const [editingLink, setEditingLink] = useState<EditingLink | null>(null)
  // 마지막으로 서버와 맞춘 그림. 지금 화면과 다르면 아직 저장 안 된 변경이 있다는 뜻이다.
  // 플래그로 들지 않고 매번 비교하는 이유: 저장 요청이 오가는 동안 사용자가 또 움직여도
  // '저장됨'으로 잘못 넘어가지 않는다.
  const [baseline, setBaseline] = useState<string | null>(null)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const unsaved =
    baseline !== null &&
    JSON.stringify(toRequest(groups, nodes, links)) !== baseline

  const saveMutation = useMutation({
    ...relationGraphMutation.replace(),
    onSuccess: (data, variables) => {
      // 응답이 곧 저장된 그림이라 캐시를 그대로 갈아 끼운다(되받아 그릴 게 없으니 refetch 하지 않는다).
      queryClient.setQueryData(relationGraphQuery.allKey, data)
      // 방금 보낸 그림이 새 기준선이다. 실패하면 기준선이 그대로라 버튼은 계속 '저장'으로 남는다.
      setBaseline(JSON.stringify(variables))
      void trackFeature(featureEvents.relationGraphSaved, {
        groups: variables.groups.length,
        nodes: variables.nodes.length,
        links: variables.links.length,
      })
    },
  })

  const save = () => saveMutation.mutate(toRequest(groups, nodes, links))

  // 뒤로 가기. pop 이 아무것도 안 하는 자리(루트)에서는 홈으로 되돌린다 —
  // 눌러도 아무 일이 없는 버튼이 없는 버튼보다 나쁘다.
  const leave = () => {
    if (isRoot) replace('Main', { tab: 'home' })
    else pop()
  }

  // 저장은 손으로만 한다(자동 저장 없음). 그래서 나가기 전에 한 번 물어야 한다 —
  // 안 물으면 적어 둔 친밀도·메모가 말없이 사라진다.
  const requestLeave = () => {
    if (unsaved) setLeaveOpen(true)
    else leave()
  }

  // 서버 상태를 화면 상태로 **한 번만** 옮긴다. 이후의 진실은 손에 있다 —
  // 저장 응답이 돌아올 때마다 다시 씌우면 끌던 노드가 뒤로 튄다.
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current || !graphQuery.data || personsQuery.isPending) return
    const nameById = new Map(
      persons.map((person) => [person.id, formatPersonName(person)]),
    )
    const restoredGroups = graphQuery.data.groups.map((group) => ({
      key: group.key,
      name: group.name,
      color: group.color ?? null,
      x: group.x,
      y: group.y,
      width: group.width,
      height: group.height,
    }))
    const restored = graphQuery.data.nodes
      .filter((node) => nameById.has(node.personId))
      .map((node) => ({
        id: node.personId,
        name: nameById.get(node.personId) ?? '',
        x: node.x,
        y: node.y,
        groupKey: node.groupKey ?? null,
      }))
    const restoredLinks = graphQuery.data.links.map((link) => ({
      from: link.fromPersonId,
      to: link.toPersonId,
      intimacy: link.intimacy,
      note: link.note ?? null,
    }))
    setGroups(restoredGroups)
    setNodes(restored)
    setLinks(restoredLinks)
    setBaseline(
      JSON.stringify(toRequest(restoredGroups, restored, restoredLinks)),
    )
    seeded.current = true
  }, [graphQuery.data, personsQuery.isPending, persons])

  const openPicker = () => {
    setChecked(new Set(nodes.map((node) => node.id)))
    setKeyword('')
    setPickerOpen(true)
  }

  const toggle = (personId: number) => {
    setChecked((current) => {
      const next = new Set(current)
      if (next.has(personId)) next.delete(personId)
      else next.add(personId)
      return next
    })
  }

  // 관계태그별 무리. 태그는 이미 "이 사람들은 한 무리"라는 사용자의 말이라, 지도의 구역 후보가 된다.
  // 사람이 많은 무리부터 보인다 — 지도를 채우는 일은 큰 덩어리부터 놓는 편이 빠르다.
  const tagGroups = useMemo(() => {
    const byTag = new Map<number, { tag: ChipRef; members: PersonResponse[] }>()
    persons.forEach((person) => {
      person.relationTags.forEach((tag) => {
        const entry = byTag.get(tag.id) ?? { tag, members: [] }
        entry.members.push(person)
        byTag.set(tag.id, entry)
      })
    })
    return [...byTag.values()].sort(
      (a, b) => b.members.length - a.members.length,
    )
  }, [persons])

  // 이름으로 못 찾을 때가 있어 소속까지 함께 훑는다(사람 검색 화면과 같은 감각).
  const term = keyword.trim().toLowerCase()
  const matches = (person: PersonResponse) => {
    if (!term) return true
    const haystack = [
      formatPersonName(person),
      affiliationLabel(person.affiliation) ?? '',
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(term)
  }
  const visible = persons.filter(matches)

  const applyPicker = () => {
    setNodes((current) => {
      const kept = current.filter((node) => checked.has(node.id))
      const added = persons
        .filter(
          (person) =>
            checked.has(person.id) &&
            !current.some((node) => node.id === person.id),
        )
        .map((person, index) => ({
          id: person.id,
          name: formatPersonName(person),
          groupKey: null,
          // 자리는 '남는 사람' 기준이다 — 방금 체크를 푼 사람의 자리까지 피하면
          // 새 사람이 빈 들판 저 아래에 떨어진다.
          ...freePosition(index, groups, kept),
        }))
      return [...kept, ...added]
    })
    // 내린 사람에게 걸려 있던 선은 함께 사라진다(양끝이 다 지도에 있어야 선이 성립한다).
    setLinks((current) =>
      current.filter((link) => checked.has(link.from) && checked.has(link.to)),
    )
    setPickerOpen(false)
  }

  const connect = (from: number, to: number) => {
    setLinks((current) => addPairs(current, [[from, to]]))
  }

  const removeNode = (id: number) => {
    setNodes((current) => current.filter((node) => node.id !== id))
    setLinks((current) =>
      current.filter((link) => link.from !== id && link.to !== id),
    )
  }

  /**
   * 관계태그로 구역 한 채를 통째로 불러온다 — 태그가 이미 "이 사람들은 한 무리"라고
   * 말해 두었으므로, 지도에서 그걸 다시 손으로 모으게 하는 건 같은 일을 두 번 시키는 것이다.
   *
   * 태그는 참조하지 않고 이름·색만 복사한다(서버도 같은 규약) — 태그를 고치거나 지워도
   * 지도 위 구획은 사용자가 놓아둔 그대로 남아야 한다.
   */
  const loadTagGroup = (tag: ChipRef, members: PersonResponse[]) => {
    const key = `tag:${tag.id}`
    const size = groupSize(members.length)
    const existing = groups.find((group) => group.key === key)
    const group: MapGroup = existing
      ? { ...existing, ...size }
      : {
          key,
          name: tag.label,
          color: normalizeChipColor(tag.color),
          ...nextGroupOrigin(groups, nodes),
          ...size,
        }
    setGroups(
      existing
        ? groups.map((item) => (item.key === key ? group : item))
        : [...groups, group],
    )
    setNodes((current) => {
      // 이미 지도에 있던 사람도 이 구역으로 데려온다 — '불러오기'는 무리를 다시 모으는 일이지
      // 새 사람만 얹는 일이 아니다. 이어 둔 선은 인물 id 로 걸려 있어 그대로 남는다.
      const others = current.filter(
        (node) => !members.some((person) => person.id === node.id),
      )
      const placed = members.map((person, index) => ({
        id: person.id,
        name: formatPersonName(person),
        groupKey: key,
        ...memberPosition(group, index, members.length),
      }))
      return [...others, ...placed]
    })
    // 관계태그로 묶였다는 건 이미 **서로 아는 사이**라는 말이다 — 한 무리를 불러온 뒤
    // 그 안을 사람 손으로 다시 이어야 한다면, 태그가 알려 준 사실을 버리는 셈이다.
    // 이미 있는 선은 그대로 둔다(적어 둔 친밀도·메모를 덮지 않는다).
    const pairs: [number, number][] = []
    members.forEach((person, index) => {
      members.slice(index + 1).forEach((other) => {
        pairs.push([person.id, other.id])
      })
    })
    setLinks((current) => addPairs(current, pairs))
    setPickerOpen(false)
    void trackFeature(featureEvents.relationGraphGroupLoaded)
  }

  const moveGroup = (key: string, x: number, y: number) => {
    const group = groups.find((item) => item.key === key)
    if (!group) return
    const dx = x - group.x
    const dy = y - group.y
    setGroups((current) =>
      current.map((item) => (item.key === key ? { ...item, x, y } : item)),
    )
    // 구역을 옮기면 그 안의 사람도 같이 간다 — 땅만 움직이고 사람이 남으면 구획이 깨진다.
    setNodes((current) =>
      current.map((node) =>
        node.groupKey === key
          ? { ...node, x: node.x + dx, y: node.y + dy }
          : node,
      ),
    )
  }

  // 구역만 걷어낸다. 사람은 지도에 그대로 남는다 — 구획은 보기 위한 선이지 사람의 자격이 아니다.
  const removeGroup = (key: string) => {
    setGroups((current) => current.filter((group) => group.key !== key))
    setNodes((current) =>
      current.map((node) =>
        node.groupKey === key ? { ...node, groupKey: null } : node,
      ),
    )
  }

  const dropNode = (id: number, groupKey: string | null) => {
    setNodes((current) =>
      current.map((node) => (node.id === id ? { ...node, groupKey } : node)),
    )
  }

  const openLink = (link: GraphLink) => {
    const nameOf = (id: number) =>
      nodes.find((node) => node.id === id)?.name ?? ''
    setEditingLink({
      from: link.from,
      to: link.to,
      fromName: nameOf(link.from),
      toName: nameOf(link.to),
      intimacy: link.intimacy,
      note: link.note ?? '',
    })
  }

  const sameLink = (link: GraphLink, target: EditingLink) =>
    link.from === target.from && link.to === target.to

  const saveLink = () => {
    if (!editingLink) return
    const note = editingLink.note.trim()
    setLinks((current) =>
      current.map((link) =>
        sameLink(link, editingLink)
          ? { ...link, intimacy: editingLink.intimacy, note: note || null }
          : link,
      ),
    )
    setEditingLink(null)
  }

  const disconnectLink = () => {
    if (!editingLink) return
    setLinks((current) =>
      current.filter((link) => !sameLink(link, editingLink)),
    )
    setEditingLink(null)
  }

  return (
    <ActivityShell layout="fixed">
      {/* 다른 설정 화면과 달리 머리에 저장 버튼을 함께 둔다 — 저장하는 순간을 사용자가 정하므로
          누를 곳이 화면에 늘 보여야 한다. */}
      <header className="shrink-0 pb-4">
        <div className="mb-2 flex items-center justify-between">
          <BackButton onClick={requestLeave} />
          <Button
            type="button"
            size="sm"
            variant={unsaved ? 'default' : 'secondary'}
            disabled={saveMutation.isPending || !unsaved}
            onClick={save}
          >
            {saveMutation.isPending ? '저장 중…' : unsaved ? '저장' : '저장됨'}
          </Button>
        </div>
        <PageTitle>인물관계도</PageTitle>
      </header>

      <p className="mb-3 shrink-0 text-xs font-medium text-muted-foreground">
        누가 누구를 아는지 손으로 이어 보세요. 이어진 선을 누르면 친밀도와
        어떻게 아는 사이인지 적을 수 있어요. 다 그렸으면 오른쪽 위{' '}
        <span className="font-bold text-foreground">저장</span>을 눌러 주세요.
      </p>

      <div className="min-h-0 flex-1 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {graphQuery.isPending ? (
          <StatusMessage inset="list">관계도를 불러오는 중…</StatusMessage>
        ) : graphQuery.isError ? (
          <StatusMessage tone="error" inset="list">
            관계도를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </StatusMessage>
        ) : (
          <RelationGraphCanvas
            groups={groups}
            nodes={nodes}
            links={links}
            onMoveNode={(id, x, y) =>
              setNodes((current) =>
                current.map((node) =>
                  node.id === id ? { ...node, x, y } : node,
                ),
              )
            }
            onDropNode={dropNode}
            onMoveGroup={moveGroup}
            onRemoveGroup={removeGroup}
            onConnect={connect}
            onAddNode={openPicker}
            onRemoveNode={removeNode}
            onSelectLink={openLink}
          />
        )}
      </div>

      {saveMutation.isError ? (
        <p className="shrink-0 pb-2 text-xs font-bold text-destructive">
          관계도를 저장하지 못했어요. 잠시 후 다시 옮겨 보세요.
        </p>
      ) : null}

      <Drawer open={pickerOpen} onOpenChange={setPickerOpen}>
        <DrawerContent className="max-h-[76vh] overflow-hidden">
          <DrawerTitle className="mt-1 mb-3 px-5 text-body font-semibold">
            관계도에 올릴 사람
          </DrawerTitle>

          {tagGroups.length > 0 ? (
            <div className="shrink-0 pb-3">
              <p className="mb-2 px-5 text-caption font-medium text-muted-foreground">
                관계로 한 번에 올리기 — 누르면 그 무리가 지도에 한 구역으로
                놓여요.
              </p>
              {/* 가로 스크롤 한 줄로 둔다. 태그가 많아도 목록을 밀어내지 않아야
                  '한 명씩 고르기'가 여전히 이 시트의 본래 일로 보인다. */}
              <div className="flex gap-2 overflow-x-auto px-5 pb-1">
                {tagGroups.map(({ tag, members }) => (
                  <TagChip
                    key={tag.id}
                    size="sm"
                    color={tag.color}
                    selected={groups.some(
                      (group) => group.key === `tag:${tag.id}`,
                    )}
                    onClick={() => loadTagGroup(tag, members)}
                    data-amp-mask
                  >
                    {tag.label} {members.length}
                  </TagChip>
                ))}
              </div>
            </div>
          ) : null}

          <div className="relative shrink-0 px-5 pb-3">
            <Search className="pointer-events-none absolute top-1/2 left-8 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="이름·소속 검색"
              aria-label="올릴 사람 검색어"
              data-amp-mask
              className="h-10 rounded-full border-border bg-card pr-10 pl-9 text-body"
            />
            {keyword ? (
              <button
                type="button"
                aria-label="검색어 지우기"
                onClick={() => setKeyword('')}
                className="absolute top-1/2 right-7 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5">
            {personsQuery.isPending ? (
              <StatusMessage inset="list">불러오는 중…</StatusMessage>
            ) : persons.length === 0 ? (
              <StatusMessage inset="list">
                아직 기록한 사람이 없어요.
              </StatusMessage>
            ) : visible.length === 0 ? (
              <StatusMessage inset="list">
                검색 결과가 없어요. 이름 대신 소속으로도 찾을 수 있어요.
              </StatusMessage>
            ) : (
              <ListGroup>
                {visible.map((person, index) => (
                  <PersonPickRow
                    key={person.id}
                    person={person}
                    selected={checked.has(person.id)}
                    withDivider={index < visible.length - 1}
                    onToggle={() => toggle(person.id)}
                  />
                ))}
              </ListGroup>
            )}
          </div>

          <NextBar label={`${checked.size}명 올리기`} onNext={applyPicker} />
        </DrawerContent>
      </Drawer>

      <ConfirmPopup
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="저장하지 않고 나갈까요?"
        description="지금까지 올린 사람과 이어 둔 관계가 사라져요."
        confirmLabel="나가기"
        destructive
        onConfirm={() => {
          setLeaveOpen(false)
          leave()
        }}
      />

      <RelationLinkSheet
        link={editingLink}
        onChange={setEditingLink}
        onSave={saveLink}
        onDisconnect={disconnectLink}
        onOpenChange={(open) => {
          if (!open) setEditingLink(null)
        }}
      />
    </ActivityShell>
  )
}
