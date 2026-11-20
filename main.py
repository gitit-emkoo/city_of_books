import pygame
import sys
import platform
import math

# ============================================================
# 초기화 및 화면 설정
# ============================================================
pygame.init()
screen = pygame.display.set_mode((800, 600))
pygame.display.set_caption("책들의 도시: 전설의 책을 찾아서 (마우스 이동)")
clock = pygame.time.Clock()

# 한글 폰트 설정
def get_korean_font(size):
    system = platform.system()
    font_candidates = []
    if system == "Windows":
        font_candidates = ["malgungothic", "gulim", "batang"]
    elif system == "Darwin":
        font_candidates = ["AppleGothic", "NanumGothic", "Arial Unicode MS"]
    else:
        font_candidates = ["NanumGothic", "NotoSansCJK", "DejaVuSans"]
    
    for name in font_candidates:
        try:
            f = pygame.font.SysFont(name, size)
            f.render("테스트", True, (255, 255, 255))
            return f
        except Exception:
            continue
    return pygame.font.Font(None, size)

font = get_korean_font(20)
title_font = get_korean_font(40)

# ============================================================
# 색상 정의
# ============================================================
COLOR_BG_VILLAGE = (45, 60, 40)
COLOR_BG_CAVE = (20, 15, 35)
COLOR_PLAYER = (220, 180, 100)
COLOR_PORTAL = (100, 200, 255)
COLOR_BOOK = (255, 215, 0)
COLOR_TEXT = (230, 230, 230)
COLOR_TARGET = (255, 100, 100)  # 목표지점 표시

# ============================================================
# 게임 상태
# ============================================================
current_map = "village"
game_won = False

# 플레이어 설정
player_x, player_y = 400, 300
player_speed = 4
player_rect = pygame.Rect(player_x, player_y, 24, 24)

# 마우스 이동 관련 변수
target_x, target_y = player_x, player_y  # 목표 지점
is_moving = False

# 포털 및 목표물 위치
village_portal = pygame.Rect(700, 250, 50, 100)
cave_portal = pygame.Rect(50, 250, 50, 100)
legendary_book = pygame.Rect(650, 450, 40, 40)

# ============================================================
# 그리기 함수
# ============================================================
def draw_text(text, x, y, color=COLOR_TEXT, use_title=False):
    target_font = title_font if use_title else font
    surf = target_font.render(text, True, color)
    screen.blit(surf, (x, y))

def draw_village():
    screen.fill(COLOR_BG_VILLAGE)
    pygame.draw.rect(screen, (101, 67, 33), (100, 100, 150, 80))
    pygame.draw.rect(screen, (34, 139, 34), (120, 50, 110, 60))
    
    draw_text("부흐링 마을 (책들의 도시)", 20, 20)
    draw_text("🖱️ 마우스 클릭으로 이동 | ▶ 오른쪽 포털로 이동", 20, 550, (150, 200, 255))
    pygame.draw.rect(screen, COLOR_PORTAL, village_portal)
    draw_text("동굴입구", village_portal.x - 10, village_portal.y - 25)

def draw_cave():
    screen.fill(COLOR_BG_CAVE)
    pygame.draw.circle(screen, (150, 50, 200), (200, 150), 20)
    pygame.draw.polygon(screen, (100, 200, 255), [(500, 400), (520, 350), (540, 400)])
    
    draw_text("속삭이는 동굴 (부흐링 지하 미로)", 20, 20)
    draw_text("🖱️ 마우스 클릭으로 이동 | ✨ 전설의 책 찾기!", 20, 550, (255, 215, 0))
    pygame.draw.rect(screen, COLOR_PORTAL, cave_portal)
    pygame.draw.rect(screen, COLOR_BOOK, legendary_book)
    draw_text("전설의 책", legendary_book.x - 15, legendary_book.y - 25, COLOR_BOOK)

# ============================================================
# 메인 루프
# ============================================================
while True:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            pygame.quit()
            sys.exit()
        
        # 마우스 클릭 이벤트 처리
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:  # 왼쪽 클릭
            if not game_won:
                target_x, target_y = event.pos
                is_moving = True

    # 클리어 화면
    if game_won:
        screen.fill((0, 0, 0))
        draw_text("전설의 책을 발견했다!", 220, 250, COLOR_BOOK, use_title=True)
        pygame.display.flip()
        clock.tick(30)
        continue

    # 마우스 이동 로직
    if is_moving:
        # 현재 위치와 목표 위치 사이의 거리 계산
        dx = target_x - player_x
        dy = target_y - player_y
        distance = math.sqrt(dx * dx + dy * dy)
        
        # 목표지에 도착했는지 확인 (거리가 매우 가까우면)
        if distance < 2:
            player_x, player_y = target_x, target_y
            is_moving = False
        else:
            # 이동 방향 계산 및 속도 적용
            move_x = (dx / distance) * player_speed
            move_y = (dy / distance) * player_speed
            
            player_x += move_x
            player_y += move_y

    # 화면 경계 제한
    player_x = max(0, min(800 - 24, player_x))
    player_y = max(0, min(600 - 24, player_y))
    player_rect.topleft = (player_x, player_y)

    # 맵 전환 및 아이템 획득 로직
    if current_map == "village":
        if player_rect.colliderect(village_portal):
            current_map = "cave"
            player_x, player_y = 150, 300
            target_x, target_y = player_x, player_y
            is_moving = False
    elif current_map == "cave":
        if player_rect.colliderect(cave_portal):
            current_map = "village"
            player_x, player_y = 600, 300
            target_x, target_y = player_x, player_y
            is_moving = False
        if player_rect.colliderect(legendary_book):
            game_won = True

    # 화면 그리기
    if current_map == "village":
        draw_village()
    else:
        draw_cave()
    
    # 목표지점 표시 (이동 중일 때만)
    if is_moving:
        pygame.draw.circle(screen, COLOR_TARGET, (int(target_x), int(target_y)), 5)
        pygame.draw.circle(screen, COLOR_TARGET, (int(target_x), int(target_y)), 8, 2)
    
    # 플레이어 그리기
    pygame.draw.rect(screen, COLOR_PLAYER, player_rect)
    pygame.draw.rect(screen, (50, 50, 50), player_rect, 2)

    pygame.display.flip()
    clock.tick(60)