// 홈에서 '인물을 고르는 컨트롤'(궤도 노드·리스트 행)에 붙이는 표식.
// 관계 카드 시트가 비모달이라 바깥 클릭 = 닫기인데, 다른 인물을 고르는 클릭만은
// 닫기 대신 내용 교체여야 해서 시트가 이 표식으로 둘을 구분한다.
export const PERSON_NODE_ATTRIBUTE = 'data-person-node'

export const personNodeProps = { [PERSON_NODE_ATTRIBUTE]: '' } as const
