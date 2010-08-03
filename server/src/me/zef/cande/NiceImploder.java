package me.zef.cande;

import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;

import org.spoofax.jsglr.BadTokenException;
import org.spoofax.jsglr.InvalidParseTableException;
import org.spoofax.jsglr.MultiBadTokenException;
import org.spoofax.jsglr.ParseException;
import org.spoofax.jsglr.ParseTableManager;
import org.spoofax.jsglr.SGLR;
import org.spoofax.jsglr.SGLRException;
import org.spoofax.jsglr.TokenExpectedException;

import aterm.ATerm;
import aterm.ATermAppl;
import aterm.ATermInt;
import aterm.ATermList;
import aterm.pure.PureFactory;

public class NiceImploder {

	private PureFactory factory = new PureFactory();
	private SGLR sglr;

	static ParseTableManager ptm = new ParseTableManager();

	public NiceImploder(String parseTablePath) throws FileNotFoundException, IOException, InvalidParseTableException {
		sglr = new SGLR(ptm.getFactory(), ptm.loadFromFile(parseTablePath));
	}

	public ATerm parse(String code) throws TokenExpectedException, BadTokenException, ParseException, IOException,
			SGLRException {
		ATerm t;
		try {
			t = sglr.parse(code);
		} catch (BadTokenException e) {
			return factory.make("parseerror(<int>, <int>, <str>)", e.getLineNumber(), e.getColumnNumber(), e
					.getShortMessage());
		}
		try {
			t = wrapConstructor("parsetree", (ATermList) implode((ATermAppl) ((ATermAppl) t).getChildAt(0)));
		} catch (RuntimeException re) {
			return factory.make("parserror(0, 0, \"Parsing failed, maybe grammar is ambiguous?\")");
		}
		return flatten(t);
	}

	public ATerm implode(ATerm term) {
		// System.out.println(term);
		ATermList returnValue = factory.makeList();
		if (term.match("amb(<term>)") != null) {
			throw new RuntimeException("Ambiguous!");
		}
		ATerm prod = (ATerm) term.getChildAt(0);
		ATermList impls = (ATermList) term.getChildAt(1);
		ATerm attrs = (ATerm) prod.getChildAt(2);
		ATermList parts = (ATermList) prod.getChildAt(0);
		for (int partIdx = 0; partIdx < parts.getChildCount(); partIdx++) {
			// Determine types
			ATerm typeTerm = (ATerm) parts.getChildAt(partIdx);
			ATerm impl = (ATerm) impls.getChildAt(partIdx);
			List<ATerm> match;

			// layout
			match = typeTerm.match("cf(opt(layout()))");
			if (match != null) { // LAYOUT
				returnValue = returnValue.append(factory.make("l(<term>)", implode((ATermAppl) impl)));
				continue;
			}
			match = typeTerm.match("cf(layout())");
			if (match != null) {
				returnValue = returnValue.append(implode((ATermAppl) impl));
				continue;
			}
			match = typeTerm.match("lex(layout())");
			if (match != null) {
				returnValue = returnValue.append(implode(impl));
				continue;
			}
			// lexical syntax
			match = typeTerm.match("lex(iter(<term>))");
			if (match != null) {
				returnValue = returnValue.append(implode((ATermAppl) impl));
				continue;
			}
			match = typeTerm.match("lex(<term>)");
			if (match != null) {
				returnValue = returnValue.append(implode((ATermAppl) impl));
				continue;
			}
			match = typeTerm.match("char-class(<list>)");
			if (match == null) {
				match = typeTerm.match("lex(alt(<term>, <term>))");
			}
			if (match != null) {
				if (impl instanceof ATermInt) {
					returnValue = returnValue.append(factory.make("<str>", String.valueOf((char) ((ATermInt) impl)
							.getInt())));
				} else {
					returnValue = returnValue.append(implode((ATermAppl) impl));
				}
				continue;
			}
			match = typeTerm.match("cf(<term>)");
			if (match != null) {
				returnValue = returnValue.append(implode((ATermAppl) impl));
				continue;
			}
			match = typeTerm.match("sort(<str>)");
			if (match != null) {
				continue;
			}
			match = typeTerm.match("lit(<term>)");
			if (match != null) {
				returnValue = returnValue.append(factory.make("kw(<term>)", match.get(0)));
				continue;
			}
			throw new RuntimeException("Could not handle: " + typeTerm);
		}
		String cons = null;
		List<ATerm> match = attrs.match("attrs(<term>)");
		if (match != null) {
			ATermList attributes = (ATermList) match.get(0);
			for (int i = 0; i < attributes.getLength(); i++) {
				match = ((ATerm) attributes.getChildAt(i)).match("term(cons(<term>))");
				if (match != null) {
					cons = ((ATermAppl) match.get(0)).getName();
				}
			}
		}
		if (cons != null) {
			return wrapConstructor(cons, returnValue);
		}
		return returnValue;
	}

	private ATerm wrapConstructor(String cons, ATermList items) {
		ATermList annos = factory.makeList();
		for (int j = 0; j < items.getLength(); j++) {
			ATerm t = (ATerm) items.getChildAt(j);
			if (t.match("l(<term>)") == null && t.match("kw(<term>)") == null) {
				annos = factory.makeList(factory.makeInt(j), annos);
			} else if (t.match("kw(<term>)") != null) {
				items = (ATermList) items.setChildAt(j, t.match("kw(<term>)").get(0));
			}
			if (t.match("l([])") != null) {
				items = items.removeElementAt(j);
				j--;
			}
		}
		ATerm constr = factory.makeApplList(factory.makeAFun(cons, items
				.getLength(), false), items);
		return constr.setAnnotations(annos.reverse());
	}

	public ATerm flatten(ATerm t) {
		if (t.getType() == ATerm.LIST) {
			ATermList l = (ATermList) t;
			for (int i = 0; i < l.getLength(); i++) {
				if (l.getChildAt(i) instanceof ATermList) {
					ATermList l2 = (ATermList) l.getChildAt(i);
					l = l.removeElementAt(i);
					for (int j = l2.getLength() - 1; j >= 0; j--) {
						l = l.insertAt(flatten((ATerm) l2.getChildAt(j)), i);
					}
					i--;
				} else if (((ATerm) l.getChildAt(i)).match("l([])") != null) {
					l = l.removeElementAt(i);
					i--;
				} else {
					l = (ATermList) l.setChildAt(i, flatten((ATerm) l.getChildAt(i)));
				}
			}
			if (l.getLength() > 0 && ((ATerm) l.getChildAt(0)).match("<str>") != null) {
				StringBuffer buf = new StringBuffer();
				for (int i = 0; i < l.getLength(); i++) {
					List<ATerm> match = ((ATerm) l.getChildAt(i)).match("<str>");
					if (match == null) {
						return l; // not all are lit thingies
					}
					buf.append(match.get(0));
				}
				ATerm ret = factory.make("<str>", buf.toString());
				return ret;
			}
			ATermList annos = factory.makeList();
			for (int j = 0; j < l.getLength(); j++) {
				ATerm t1 = (ATerm) l.getChildAt(j);
				if (t1.match("l(<term>)") == null && t1.match("kw(<term>)") == null) {
					annos = factory.makeList(factory.makeInt(j), annos);
				} else if (t1.match("kw(<term>)") != null) {
					l = (ATermList) l.setChildAt(j, t1.match("kw(<term>)").get(0));
				}
			}
			return l.setAnnotations(annos.reverse());
		} else {

			for (int i = 0; i < t.getChildCount(); i++) {
				ATerm flattened = flatten((ATerm) t.getChildAt(i));
				// System.out.println("Got back: " + flattened);
				t = (ATerm) t.setChildAt(i, flattened);
			}
			return t;
		}
	}
}
