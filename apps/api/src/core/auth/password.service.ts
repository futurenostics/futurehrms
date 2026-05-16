import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * Argon2id wrapper.
 *
 * Parameters follow the OWASP cheat sheet — memory 19 MiB, 2 iterations,
 * single-thread parallelism. Argon2 is preferred over bcrypt for new
 * projects because it's the PHC winner and resists GPU attacks better.
 */
@Injectable()
export class PasswordService {
  private readonly options: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  };

  hash(plaintext: string): Promise<string> {
    return argon2.hash(plaintext, this.options);
  }

  async verify(hash: string, plaintext: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plaintext);
    } catch {
      // argon2.verify throws on malformed hash; treat as mismatch
      return false;
    }
  }
}
