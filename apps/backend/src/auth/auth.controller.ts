import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  UseGuards, 
  Request, 
  Response,
  HttpCode, 
  HttpStatus 
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { PrismaService } from 'prisma/prisma.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto, LoginDto, GoogleLoginDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('register')
  async register(@Body() data: RegisterDto) {
    return this.authService.register(data);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() data: LoginDto) {
    return this.authService.login(data);
  }

  // --- LOGIN SOCIAL WEB (REDIRECIONAMENTO) ---

  // 1. Rota que o botão do Frontend chama: GET /auth/google
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // O Passport redireciona automaticamente para o Google
  }

  // 2. Rota que o Google chama de volta após o login bem-sucedido
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Request() req, @Response() res) {
    // O AuthService deve processar o usuário e gerar um JWT
    const { access_token } = await this.authService.loginSocial(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    // Redireciona o usuário de volta para o Frontend com o Token na URL
    // O Frontend deve capturar esse token e salvar no LocalStorage
    return res.redirect(`${frontendUrl}/auth-success?token=${access_token}`);
  }

  // --- LOGIN SOCIAL MOBILE/API (POST TOKEN) ---
  
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() data: GoogleLoginDto) {
    return this.authService.googleLogin(data);
  }

  // --- PERFIL DO USUÁRIO ---

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    return this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        familyGroupId: true,
        familyGroup: {
          include: {
            members: {
              select: {
                id: true,
                name: true,
                avatar: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }
}