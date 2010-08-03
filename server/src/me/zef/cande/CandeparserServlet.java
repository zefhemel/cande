package me.zef.cande;

import java.io.IOException;
import java.io.StringWriter;

import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.*;

import org.apache.commons.io.IOUtils;
import org.spoofax.jsglr.InvalidParseTableException;

import aterm.ATerm;

@SuppressWarnings("serial")
public class CandeparserServlet extends HttpServlet {
	private ServletContext context;

	@Override
	public void init(ServletConfig config) throws ServletException {
		this.context = config.getServletContext();
	}

	public void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		resp.setContentType("text/plain");
		String text = "NOTHING";
		System.out.println("Got request");
		try {
			StringWriter writer = new StringWriter();
			IOUtils.copy(req.getInputStream(), writer);
			text = writer.toString();
			String language = req.getParameter("lang");
			String callback = req.getParameter("callback");
			NiceImploder impl = new NiceImploder(context.getRealPath("/WEB-INF/" + language + ".tbl"));
			ATerm result;
			if(text.equals("")) {
				text = req.getParameter("code");
			}
			result = impl.parse(text);
			System.out.println("Code: " + text);
			String resultString;
			if(callback != null) {
				resultString = callback + "(\"" + escape(result.toString()) + "\")";
			} else {
				resultString = result.toString();
			}
			System.out.println(resultString);
			resp.getWriter().print(resultString);
		} catch (Exception e) {
			System.out.println("The code: " + text);
			e.printStackTrace();
			throw new RuntimeException(e);
		}
	}
	
	public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		doPost(req, resp);
	}
	
	public String escape(String s) {
		StringBuilder b = new StringBuilder();
		for(int i = 0; i < s.length(); i++) {
			if(s.charAt(i) == '\\') {
				b.append("\\\\");
			} else if(s.charAt(i) == '"') {
				b.append("\\\"");
			} else {
				b.append(s.charAt(i));
			}
		}
		return b.toString();
	}
}
