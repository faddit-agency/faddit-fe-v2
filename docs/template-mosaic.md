# Cruip Mosaic 템플릿 정보

이 프로젝트는 [Cruip Mosaic](https://cruip.com/) 템플릿을 기반으로 시작했습니다.  
아래는 템플릿에서 온 디렉터리·파일 목록과, 나중에 정리할 때 참고할 수 있는 정보입니다.

---

## 템플릿 출처

- **템플릿명**: Cruip Mosaic
- **기술 스택**: React, Vite, Tailwind CSS (템플릿 공통)

---

## 템플릿 관련 디렉터리·파일

### 1. `src/partials/` (전부 템플릿)

페이지별로 사용되는 레이아웃 조각들. 데모 페이지와 1:1로 연결됨.

| 디렉터리 | 용도 |
|----------|------|
| `partials/` | Sidebar, Header, SidebarLinkGroup |
| `partials/actions/` | SearchForm, DeleteButton |
| `partials/analytics/` | AnalyticsCard01~11 |
| `partials/applications/` | ApplicationsCard01~03 |
| `partials/campaigns/` | CampaignsCard |
| `partials/community/` | Feed, Forum, Profile, Meetups, Users 관련 |
| `partials/customers/` | CustomersTable, CustomersTableItem |
| `partials/dashboard/` | DashboardCard01~11 |
| `partials/ecommerce/` | Shop, Cart 관련 |
| `partials/finance/` | Transactions, TransactionPanel |
| `partials/fintech/` | FintechIntro, FintechCard01~14 |
| `partials/inbox/` | InboxSidebar, InboxBody, Mail |
| `partials/invoices/` | InvoicesTable, InvoicesTableItem |
| `partials/job/` | JobSidebar, JobListItem |
| `partials/messages/` | Channels, MessagesBody, MessagesHeader 등 |
| `partials/orders/` | OrdersTable, OrdersTableItem |
| `partials/settings/` | AccountPanel, BillingPanel, AppsPanel 등 |
| `partials/tasks/` | TasksGroups, Task01~09 |

### 2. `src/pages/` 중 템플릿 데모 페이지

Faddit 전용이 **아닌** 페이지들 (나중에 제거 후보).

- **루트**: `Dashboard.jsx`, `Analytics.jsx`, `Fintech.jsx`, `Campaigns.jsx`, `Messages.jsx`, `Inbox.jsx`, `Calendar.jsx`, `Signin.jsx`, `Signup.jsx`, `ResetPassword.jsx`, `Onboarding01~04.jsx`
- **ecommerce/**: Customers, Orders, Invoices, Shop, Shop2, Product, Cart, Cart2, Cart3, Pay
- **community/**: UsersTabs, UsersTiles, Profile, Feed, Forum, ForumPost, Meetups, MeetupsPost
- **finance/**: CreditCards, Transactions, TransactionDetails
- **job/**: JobListing, JobPost, CompanyProfile
- **tasks/**: TasksKanban, TasksList
- **settings/**: Account, Notifications, Apps, Plans, Billing, Feedback
- **utility/**: Changelog, Roadmap, Faqs, EmptyState, PageNotFound
- **component/**: ButtonPage, FormPage, DropdownPage, AlertPage, ModalPage, PaginationPage, TabsPage, BreadcrumbPage, BadgePage, AvatarPage, TooltipPage, AccordionPage, IconsPage

### 3. `src/components/` 중 템플릿 유래

공용 UI 컴포넌트. **일부는 Faddit에서 재사용할 수 있음** → 제거 전에 사용처 확인 필요.

- ModalBasic, ModalAction, ModalBlank, ModalSearch, ModalCookies, ModalFooterBasic
- AccordionBasic, AccordionTableItem, AccordionTableRichItem
- Toast, Toast2, Toast3, Notification, Banner, Banner2
- Dropdown\* (Classic, Filter, Help, Notifications, Profile, EditMenu 등)
- PaginationNumeric, PaginationNumeric2, PaginationClassic
- Datepicker, DateSelect, ThemeToggle, Tooltip
- DriveItemCard
- `components/ui/` (calendar, popover 등)

### 4. 기타 템플릿 관련

- **utils/**: `Transition.jsx`, `ThemeContext.jsx`, `Utils.js` — 데모/테마용
- **css/style.css**: 템플릿 글로벌 스타일 (Faddit에서 수정·재사용 중일 수 있음)
- **images/**: 템플릿 데모용 이미지 (avatar-01~06 등). Faddit 전용 이미지는 `images/icons/`, `images/faddit/` 등으로 구분됨

---

## 제거 시 참고 (점진적 정리)

1. **App.tsx**에서 사용하지 않는 라우트·import 먼저 제거
2. 해당 **페이지 파일** 삭제
3. 그 페이지가 참조하던 **partials**만 의존성 확인 후 삭제
4. **components**는 여러 곳에서 쓸 수 있으므로, “사용처 없음”이 확인된 것만 제거
5. **utility/PageNotFound**, **utility/EmptyState** 등은 앱에서 그대로 쓸 수 있으면 유지

---

## Faddit 전용 코드와의 구분

- **Faddit 전용**: `docs/faddit.md` 참고
- **경로로 구분**: `pages/faddit/`, `layouts/`, `constants/`, `components/atoms/` 등은 앱 코드 기준으로 유지
